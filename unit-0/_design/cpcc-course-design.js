/* ==========================================================================
   CPCC COURSE DESIGN — cpcc-course-design.js
   Companion to cpcc-course-design.css. Plain JavaScript, no libraries.

   Every component is set up automatically when the page loads, based on
   class names and data- attributes. Nothing needs to be called by hand.
   See cpcc-course-design-reference.html for working examples.

   COMPONENTS
     1. Collapsible Table of Contents      nav.toc containing .toc-item.current
     2. Collapsible solution               .solution-toggle > .solution-bar + .solution-body
     3. Section navigator                  .sn-nav > .sn-current + .sn-item[data-panel], with .sn-panel
     4. Self-check questions (flag only)   .question-block[data-check="flag"]
     5. Graded question set                [data-mc-set] containing .question-block items
     6. Shuffled answer order              .mc-options[data-shuffle]
     7. Reflection word counter            textarea[data-word-count="ID of counter element"]
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
    function keyboard(el) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    }

    /* 1. Collapsible Table of Contents ------------------------------------
       Shows only the current section until clicked; closes when clicked
       again or when the pointer leaves it. */
    CPCC.initToc = function (root) {
        $all('nav.toc', root).forEach(function (toc) {
            var current = toc.querySelector('.toc-item.current');
            if (!current || toc.dataset.cpccReady) return;
            toc.dataset.cpccReady = '1';
            toc.classList.add('toc-collapsible');
            keyboard(current);
            toc.addEventListener('click', function (e) {
                if (toc.classList.contains('toc-expanded')) toc.classList.remove('toc-expanded');
                else if (current.contains(e.target)) toc.classList.add('toc-expanded');
            });
            toc.addEventListener('mouseleave', function () { toc.classList.remove('toc-expanded'); });
        });
    };

    /* 2. Collapsible solution ---------------------------------------------
       Opens and closes the same way as the Table of Contents. A solution
       opened by CPCC.openSolution() (for example, after all answers are
       correct) stays open when the pointer leaves. */
    CPCC.initSolutions = function (root) {
        $all('.solution-toggle', root).forEach(function (box) {
            if (box.dataset.cpccReady) return;
            box.dataset.cpccReady = '1';
            var bar = box.querySelector('.solution-bar');
            if (!bar) return;
            keyboard(bar);
            bar.addEventListener('click', function () { box.classList.toggle('toc-expanded'); });
            box.addEventListener('mouseleave', function () {
                if (!box.dataset.earned) box.classList.remove('toc-expanded');
            });
        });
    };
    CPCC.openSolution = function (box, scroll) {
        if (typeof box === 'string') box = document.getElementById(box);
        if (!box) return;
        box.dataset.earned = '1';
        box.classList.add('toc-expanded');
        if (scroll !== false) setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 400);
    };

    /* 3. Section navigator --------------------------------------------------
       A gold bar opens a list of guides. Choosing one closes the list and
       opens that guide below it; choosing another closes the first.
       Inside a guide: [data-next="panelId"], [data-close], [data-finish="elementId"]. */
    CPCC.initNavigators = function (root) {
        $all('.sn-nav', root).forEach(function (nav) {
            if (nav.dataset.cpccReady) return;
            nav.dataset.cpccReady = '1';
            var cur = nav.querySelector('.sn-current');
            var items = $all('.sn-item', nav);
            var placeholder = cur.textContent;
            var panels = items.map(function (i) { return document.getElementById(i.getAttribute('data-panel')); }).filter(Boolean);

            function close(p) {
                if (!p.classList.contains('sn-open')) return;
                p.style.maxHeight = p.scrollHeight + 'px';
                requestAnimationFrame(function () { requestAnimationFrame(function () {
                    p.style.maxHeight = '0px'; p.classList.remove('sn-open');
                }); });
            }
            function open(id) {
                panels.forEach(function (p) { if (p.id !== id) close(p); });
                var p = document.getElementById(id);
                if (!p) return;
                p.classList.add('sn-open');
                p.style.maxHeight = p.scrollHeight + 'px';
                p.addEventListener('transitionend', function done(e) {
                    if (e.propertyName === 'max-height' && p.classList.contains('sn-open')) p.style.maxHeight = 'none';
                    p.removeEventListener('transitionend', done);
                });
                items.forEach(function (i) { i.classList.toggle('sn-selected', i.getAttribute('data-panel') === id); });
                var chosen = items.filter(function (i) { return i.getAttribute('data-panel') === id; })[0];
                if (chosen) cur.textContent = chosen.textContent;
                nav.classList.remove('sn-expanded');
                setTimeout(function () { nav.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
            }
            function reset() {
                items.forEach(function (i) { i.classList.remove('sn-selected'); });
                cur.textContent = placeholder;
            }
            cur.addEventListener('click', function () { nav.classList.toggle('sn-expanded'); });
            nav.addEventListener('mouseleave', function () { nav.classList.remove('sn-expanded'); });
            items.forEach(function (i) { keyboard(i); i.addEventListener('click', function () { open(i.getAttribute('data-panel')); }); });
            keyboard(cur);
            panels.forEach(function (p) {
                $all('[data-next]', p).forEach(function (b) { b.addEventListener('click', function () { open(b.getAttribute('data-next')); }); });
                $all('[data-close]', p).forEach(function (b) { b.addEventListener('click', function () {
                    close(p); reset(); nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }); });
                $all('[data-finish]', p).forEach(function (b) { b.addEventListener('click', function () {
                    close(p); reset();
                    var target = document.getElementById(b.getAttribute('data-finish'));
                    if (target) setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 950);
                }); });
            });
        });
    };

    /* 6. Shuffled answer order ---------------------------------------------
       Reorders the options in any .mc-options[data-shuffle] list and
       re-letters them. Runs before the question components below. */
    CPCC.shuffleOptions = function (root) {
        $all('.mc-options[data-shuffle]', root).forEach(function (list) {
            var lis = $all(':scope > li', list);
            shuffle(lis).forEach(function (li, k) {
                list.appendChild(li);
                var letter = li.querySelector('.mc-letter');
                if (letter) letter.textContent = LETTERS[k];
            });
        });
    };

    /* 4. Self-check questions (flag only) ----------------------------------
       One attempt per question. Shows only "Correct" or "Incorrect" and
       never reveals the right answer. If the question sits inside an
       element with data-solution="ID", that solution opens when every
       question in that element is answered correctly.
       Mark the correct option with data-correct="true". */
    CPCC.initFlagQuestions = function (root) {
        $all('.question-block[data-check="flag"]', root).forEach(function (block) {
            if (block.dataset.cpccReady) return;
            block.dataset.cpccReady = '1';
            block.classList.add('question-block--stateful');
            var feedback = block.querySelector('.feedback');
            if (!feedback) { feedback = document.createElement('div'); feedback.className = 'feedback'; block.appendChild(feedback); }
            feedback.style.display = 'none';
            $all('.mc-option', block).forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (block.dataset.done) return;
                    var right = btn.getAttribute('data-correct') === 'true';
                    block.dataset.done = right ? 'correct' : 'incorrect';
                    $all('.mc-option', block).forEach(function (b) { b.disabled = true; });
                    btn.classList.add(right ? 'graded-correct' : 'graded-incorrect');
                    feedback.innerHTML = right
                        ? '<div class="callout callout-tip"><div class="callout-title">Correct</div></div>'
                        : '<div class="callout callout-danger"><div class="callout-title">Incorrect</div></div>';
                    feedback.style.display = 'block';
                    var group = block.closest('[data-solution]');
                    if (group) {
                        var all = $all('.question-block[data-check="flag"]', group);
                        if (all.every(function (q) { return q.dataset.done === 'correct'; })) CPCC.openSolution(group.getAttribute('data-solution'));
                    }
                });
            });
        });
    };

    /* 5. Graded question set -------------------------------------------------
       Students select answers, then press [data-mc-grade]. Correct answers
       turn green, wrong choices turn red, and missed correct answers are
       outlined. [data-mc-score] shows the score; [data-mc-reset] starts over.
       Unanswered questions are flagged instead of graded. */
    CPCC.initQuestionSets = function (root) {
        $all('[data-mc-set]', root).forEach(function (set) {
            if (set.dataset.cpccReady) return;
            set.dataset.cpccReady = '1';
            var blocks = $all('.question-block', set);
            blocks.forEach(function (b) { b.classList.add('question-block--stateful'); });
            var summary = set.querySelector('.results-summary');
            var scoreEl = set.querySelector('[data-mc-score]');
            var graded = false;
            blocks.forEach(function (block) {
                $all('.mc-option', block).forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        if (graded) return;
                        $all('.mc-option', block).forEach(function (b) { b.classList.remove('selected'); });
                        btn.classList.add('selected');
                        block.classList.remove('unanswered-flag');
                    });
                });
            });
            $all('[data-mc-grade]', set).forEach(function (g) { g.addEventListener('click', function () {
                var missing = blocks.filter(function (b) { return !b.querySelector('.mc-option.selected'); });
                blocks.forEach(function (b) { b.classList.toggle('unanswered-flag', missing.indexOf(b) !== -1); });
                if (missing.length) { missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
                var score = 0; graded = true;
                blocks.forEach(function (b) {
                    $all('.mc-option', b).forEach(function (btn) {
                        var right = btn.getAttribute('data-correct') === 'true';
                        var chosen = btn.classList.contains('selected');
                        if (right && chosen) { btn.classList.add('graded-correct'); score++; }
                        else if (chosen) btn.classList.add('graded-incorrect');
                        else if (right) btn.classList.add('graded-missed');
                    });
                });
                if (scoreEl) scoreEl.textContent = score + ' / ' + blocks.length;
                if (summary) { summary.classList.add('show'); summary.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }); });
            $all('[data-mc-reset]', set).forEach(function (r) { r.addEventListener('click', function () {
                graded = false;
                blocks.forEach(function (b) {
                    b.classList.remove('unanswered-flag');
                    $all('.mc-option', b).forEach(function (btn) { btn.classList.remove('selected', 'graded-correct', 'graded-incorrect', 'graded-missed'); });
                });
                if (summary) summary.classList.remove('show');
                CPCC.shuffleOptions(set);
                set.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }); });
        });
    };

    /* 7. Reflection word counter ----------------------------------------------
       <textarea data-word-count="countId"> updates the element with
       id="countId" as the student types. */
    CPCC.initWordCounters = function (root) {
        $all('textarea[data-word-count]', root).forEach(function (t) {
            var out = document.getElementById(t.getAttribute('data-word-count'));
            if (!out) return;
            function update() {
                var n = (t.value.trim().match(/\S+/g) || []).length;
                out.textContent = n + (n === 1 ? ' word' : ' words');
            }
            t.addEventListener('input', update); update();
        });
    };

    CPCC.init = function (root) {
        CPCC.initToc(root);
        CPCC.initSolutions(root);
        CPCC.initNavigators(root);
        CPCC.shuffleOptions(root);
        CPCC.initFlagQuestions(root);
        CPCC.initQuestionSets(root);
        CPCC.initWordCounters(root);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CPCC.init(); });
    else CPCC.init();
})();
