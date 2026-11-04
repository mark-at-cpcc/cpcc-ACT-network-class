/* ==========================================================================
   CPCC COURSE DESIGN — cpcc-quiz-engine.js
   Companion to cpcc-course-design.css. Plain JavaScript, no libraries.

   One engine for every question page. It replaces the four separate scripts
   that the A+ Core 2 pages carried (Pre-Assessment, Practice Questions,
   Unit Test, Acronym Test) with one behavior, configured by data- attributes
   on a container:

     <div class="cpcc-quiz"
          data-bank="../banks/unit1/1.7.json"   file next to the page, OR an
                                                 inline <script type="application/json">
          data-mode="pool"                       "pool"   = draw data-draw items per attempt
                                                 "static" = show the whole bank in bank order
          data-draw="10"                         how many to draw in pool mode
          data-confidence="true"                 adds the Confident / Guessed self-check
          data-proof="true"                      adds the "screenshot your score" line
          data-perfect="You are ready to move on."   message shown on a perfect set
          data-title="Unit 1 Pre-Assessment">    heading on the results panel (optional)

     Full-length exams add three attributes:
          data-mode="blueprint"
          data-blueprint='{"1":21,"2":18,"3":17,"4":12,"5":22}'
                                                 items per exam domain, drawn by the
                                                 first digit of each item's "obj"
          data-scaled="720,800"                  report a 100-900 scaled score with the
                                                 passing score and the course gate
          data-timer="90"                        minutes; a countdown shows, and the
                                                 exam is graded when time runs out
       <script type="application/json" class="cpcc-bank">[ ... ]<\/script>   (inline bank)
     </div>

   BANK FORMAT (JSON array; the same shape the Core 2 pages used, so existing
   banks port with no change):
     { "q": "Question text (HTML allowed)",
       "opts": ["Choice", "Choice", "Choice", "Choice"],
       "correct": 1,                       index into opts, before shuffling
       "obj": "1.4",                       optional, for reporting
       "explain": "Shown after grading"    optional }

   WHAT THE STUDENT SEES
     - Options lettered A, B, C ... and shuffled on every attempt.
     - "Grade My Answers" refuses until every question has an answer (the
       unanswered ones are flagged), then marks the chosen answer right or
       wrong and highlights the correct one (graded-correct / graded-incorrect
       / graded-missed, the class names in cpcc-course-design.css).
     - "Reset" clears the set; in pool mode it draws a fresh set.
     - With data-confidence, three small buttons under each question record
       whether the student Guessed, was Semi-Confident, or was Confident; the
       results panel then counts "confident and wrong" and "semi-confident
       and wrong", the categories the course watches for, and "guessed and
       right", the lucky ones that are not yet learned.

   Everything is set up automatically on page load. A page can also call
   CPCC.initQuizzes(root) after inserting markup dynamically.
   ========================================================================== */
(function () {
    'use strict';

    var CPCC = window.CPCC = window.CPCC || {};
    var LETTERS = 'ABCDEFGHIJ';

    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function loadBank(box, done) {
        var inline = box.querySelector('script.cpcc-bank');
        if (inline) {
            try { done(JSON.parse(inline.textContent)); }
            catch (e) { fail(box, 'The question bank on this page could not be read. ' + e.message); }
            return;
        }
        var src = box.getAttribute('data-bank');
        if (!src) { fail(box, 'No question bank was given for this quiz.'); return; }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
                try { done(JSON.parse(xhr.responseText)); }
                catch (e) { fail(box, 'The question bank could not be read. ' + e.message); }
            } else {
                fail(box, 'The question bank (' + src + ') could not be loaded. If this page was opened from a local file, the browser may block it; use the inline-bank build instead.');
            }
        };
        xhr.send();
    }

    function fail(box, msg) {
        var warn = el('div', 'callout callout-danger');
        warn.appendChild(el('div', 'callout-title', 'Quiz Not Available'));
        warn.appendChild(el('div', 'callout-content', '<p>' + msg + '</p>'));
        box.appendChild(warn);
    }

    function Quiz(box, bank) {
        this.box = box;
        this.bank = bank;
        this.mode = box.getAttribute('data-mode') || 'pool';
        this.draw = parseInt(box.getAttribute('data-draw') || '10', 10);
        this.confidence = box.getAttribute('data-confidence') === 'true';
        this.proof = box.getAttribute('data-proof') === 'true';
        this.perfectMsg = box.getAttribute('data-perfect') || 'Perfect set.';
        this.title = box.getAttribute('data-title') || '';
        this.blueprint = box.getAttribute('data-blueprint') ? JSON.parse(box.getAttribute('data-blueprint')) : null;
        this.scaled = box.getAttribute('data-scaled') ? box.getAttribute('data-scaled').split(',').map(Number) : null;
        this.timer = parseInt(box.getAttribute('data-timer') || '0', 10);
        this.build();
        this.newSet();
    }

    Quiz.prototype.build = function () {
        var b = this.box;
        this.area = el('div', 'cpcc-quiz-area');
        this.controls = el('div', 'assessment-controls');
        this.gradeBtn = el('button', 'btn-grade', 'Grade My Answers'); this.gradeBtn.type = 'button';
        this.resetBtn = el('button', 'btn-reset', this.mode === 'pool' ? 'Reset (new set)' : 'Reset'); this.resetBtn.type = 'button';
        this.controls.appendChild(this.gradeBtn); this.controls.appendChild(this.resetBtn);
        this.results = el('div', 'results-summary');
        this.results.style.display = 'none';
        this.score = el('div', 'results-score', '0 / 0');
        this.message = el('p');
        this.conf = el('p');
        this.results.appendChild(this.score); this.results.appendChild(this.message); this.results.appendChild(this.conf);
        this.results.appendChild(el('p', '', 'Green marks the correct answer. Red marks an answer you picked that was not it.'));
        if (this.proof) this.results.appendChild(el('p', 'text-muted mt-sm', '<strong>Screenshot this score before leaving the page</strong> and upload it to the submission link in Brightspace. Nothing here is recorded automatically.'));
        b.appendChild(this.area); b.appendChild(this.controls); b.appendChild(this.results);
        var self = this;
        this.gradeBtn.addEventListener('click', function () { self.grade(); });
        this.resetBtn.addEventListener('click', function () { self.newSet(); });
    };

    Quiz.prototype.newSet = function () {
        var items = this.bank.slice();
        if (this.mode === 'pool') items = shuffle(items).slice(0, Math.min(this.draw, items.length));
        if (this.mode === 'blueprint' && this.blueprint) {
            var bp = this.blueprint, picked = [];
            Object.keys(bp).forEach(function (d) {
                var pool = shuffle(items.filter(function (it) { return String(it.obj || '').charAt(0) === d; }));
                picked = picked.concat(pool.slice(0, bp[d]));
            });
            items = shuffle(picked);
        }
        var self = this;
        this.set = items.map(function (item) {
            var order = shuffle(item.opts.map(function (_, i) { return i; }));
            return {
                q: item.q, obj: item.obj || '', explain: item.explain || '',
                opts: order.map(function (i) { return item.opts[i]; }),
                correct: order.indexOf(item.correct),
                answer: null, confidence: null
            };
        });
        this.results.style.display = 'none';
        this.render();
        this.startTimer();
        if (this.box.dataset.cpccRendered) this.box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.box.dataset.cpccRendered = '1';
    };

    Quiz.prototype.startTimer = function () {
        if (!this.timer) return;
        var self = this;
        if (!this.clock) { this.clock = el('div', 'callout callout-info'); this.box.insertBefore(this.clock, this.area); }
        if (this.tick) clearInterval(this.tick);
        var end = Date.now() + this.timer * 60000;
        var show = function () {
            var left = Math.max(0, end - Date.now()), m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
            self.clock.innerHTML = '<div class="callout-content"><p><strong>Time remaining: ' + m + ':' + (s < 10 ? '0' : '') + s + '</strong> &mdash; the exam is graded automatically when time runs out; unanswered questions count as wrong.</p></div>';
            if (left === 0) { clearInterval(self.tick); self.grade(true); }
        };
        show(); this.tick = setInterval(show, 1000);
    };

    Quiz.prototype.render = function () {
        var self = this;
        this.area.innerHTML = '';
        this.set.forEach(function (item, qi) {
            var block = el('div', 'question-block question-block--stateful');
            block.appendChild(el('div', 'question-number', 'Question ' + (qi + 1) + ' of ' + self.set.length));
            block.appendChild(el('p', 'question-text', item.q));
            var list = el('ul', 'mc-options');
            item.opts.forEach(function (opt, oi) {
                var li = el('li');
                var btn = el('button', 'mc-option'); btn.type = 'button';
                btn.appendChild(el('span', 'mc-letter', LETTERS[oi]));
                btn.appendChild(el('span', '', opt));
                btn.addEventListener('click', function () {
                    if (block.dataset.graded) return;
                    item.answer = oi;
                    $all('.mc-option', list).forEach(function (b) { b.classList.remove('selected'); });
                    btn.classList.add('selected');
                    block.classList.remove('unanswered-flag');
                });
                li.appendChild(btn); list.appendChild(li);
            });
            block.appendChild(list);
            if (self.confidence) {
                var row = el('div', 'confidence-row');
                row.appendChild(el('span', 'confidence-label', 'How sure are you?'));
                ['Guessed', 'Semi-Confident', 'Confident'].forEach(function (label, level) {
                    var cb = el('button', 'confidence-btn', label); cb.type = 'button';
                    cb.addEventListener('click', function () {
                        if (block.dataset.graded) return;
                        item.confidence = level;
                        $all('.confidence-btn', row).forEach(function (b) { b.classList.remove('selected'); });
                        cb.classList.add('selected');
                    });
                    row.appendChild(cb);
                });
                block.appendChild(row);
            }
            block.appendChild(el('p', 'unanswered-note', 'Not yet answered.'));
            block.appendChild(el('div', 'quiz-explain'));
            self.area.appendChild(block);
        });
    };

    Quiz.prototype.grade = function (timeUp) {
        var blocks = $all('.question-block', this.area);
        var missing = 0, right = 0, confWrong = 0, semiWrong = 0, luckyRight = 0, confUsed = 0;
        var self = this;
        this.set.forEach(function (item, qi) {
            var block = blocks[qi];
            if (item.answer === null) { missing++; block.classList.add('unanswered-flag'); }
        });
        if (missing && !timeUp) {
            this.message.textContent = 'Answer every question before grading — ' + missing + (missing === 1 ? ' is' : ' are') + ' still blank (flagged above).';
            this.score.textContent = '—';
            this.conf.textContent = '';
            this.results.style.display = 'block';
            var first = this.area.querySelector('.unanswered-flag');
            if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        this.set.forEach(function (item, qi) {
            var block = blocks[qi];
            block.dataset.graded = '1';
            var buttons = $all('.mc-option', block);
            buttons.forEach(function (b, oi) {
                b.classList.remove('selected');
                b.disabled = true;
                if (oi === item.correct) b.classList.add(item.answer === oi ? 'graded-correct' : 'graded-missed');
                else if (oi === item.answer) b.classList.add('graded-incorrect');
            });
            $all('.confidence-btn', block).forEach(function (b) { b.disabled = true; });
            var ok = item.answer === item.correct;
            if (ok) right++;
            if (item.confidence !== null) {
                confUsed++;
                if (item.confidence === 2 && !ok) confWrong++;
                if (item.confidence === 1 && !ok) semiWrong++;
                if (item.confidence === 0 && ok) luckyRight++;
            }
            if (item.explain) block.querySelector('.quiz-explain').innerHTML = '<div class="callout callout-info"><div class="callout-content"><p>' + item.explain + '</p></div></div>';
        });
        if (this.tick) clearInterval(this.tick);
        this.score.textContent = right + ' / ' + this.set.length;
        if (this.scaled) {
            var sc = Math.round(100 + 800 * right / this.set.length);
            this.score.textContent = 'Scaled ' + sc + '  (' + right + ' / ' + this.set.length + ')';
            this.perfectMsg = this.perfectMsg;
            var verdict = sc >= this.scaled[1] ? 'At or above the course gate of ' + this.scaled[1] + '.' : (sc >= this.scaled[0] ? 'Passing (' + this.scaled[0] + '), but below the course gate of ' + this.scaled[1] + '.' : 'Below the passing score of ' + this.scaled[0] + '.');
            this.message.textContent = verdict + ' This is the course model of CompTIA\u2019s scale (100 + 800 \u00d7 fraction correct), not CompTIA\u2019s own scoring.';
            var byDom = {};
            this.set.forEach(function (it) { var d = String(it.obj || '?').charAt(0); byDom[d] = byDom[d] || [0, 0]; byDom[d][1]++; if (it.answer === it.correct) byDom[d][0]++; });
            this.conf.innerHTML = '<strong>By domain:</strong> ' + Object.keys(byDom).sort().map(function (d) { return 'Domain ' + d + '.0 &mdash; ' + byDom[d][0] + '/' + byDom[d][1]; }).join(' &middot; ');
            this.results.style.display = 'block'; this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (right === this.set.length) this.message.textContent = this.perfectMsg;
        else this.message.textContent = 'Not a perfect set yet. Review every question you missed, then ' + (this.mode === 'pool' ? 'click Reset for a new random set.' : 'click Reset to try again.');
        if (this.confidence && confUsed) {
            var parts = ['<strong>Confident and wrong: ' + confWrong + '.</strong> ' + (confWrong ? 'Study these first — you believed something that is not true, and nothing on an ordinary score report would have told you.' : 'None.')];
            parts.push('<strong>Semi-confident and wrong: ' + semiWrong + '.</strong> ' + (semiWrong ? 'You had a doubt and it was right; find out what the doubt was about.' : 'None.'));
            parts.push('<strong>Guessed and right: ' + luckyRight + '.</strong> ' + (luckyRight ? 'Lucky, not learned — treat these as misses when you review.' : 'None.'));
            if (right === this.set.length && !luckyRight) parts.push('You were right, and you knew it.');
            this.conf.innerHTML = parts.join('<br>');
        } else this.conf.textContent = '';
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    CPCC.initQuizzes = function (root) {
        $all('.cpcc-quiz', root).forEach(function (box) {
            if (box.dataset.cpccReady) return;
            box.dataset.cpccReady = '1';
            loadBank(box, function (bank) { new Quiz(box, bank); });
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CPCC.initQuizzes(); });
    else CPCC.initQuizzes();
})();
