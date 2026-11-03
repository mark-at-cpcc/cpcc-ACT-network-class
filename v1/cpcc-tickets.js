/* ==========================================================================
   CPCC COURSE DESIGN — https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-tickets.js
   Companion to https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-course-design.css and https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-course-design.js.
   Plain JavaScript, no libraries.

   The Tickets page (Section N.11): three ticket cards, each with exhibits,
   three six-option questions, and a Ticket Solution that stays collapsed
   until every question is answered correctly (or the student opens it by
   hand). Ported from the A+ Core 2 Unit 1 Tickets page so that the
   behavior is identical:

     - one attempt per question;
     - the student sees only a Correct or Incorrect flag — the correct
       answer is never revealed;
     - three correct answers open the Ticket Solution on their own
       (CPCC.openSolution from cpcc-course-design.js, which also makes the
       solution stay open when the pointer leaves);
     - "Reset These Questions" clears the ticket and re-shuffles.

   MARKUP (inside a .ticket-card)
     <div class="ticket-questions" data-ticket="t1" data-solution="t1sol"></div>
     <div class="solution-toggle" id="t1sol"> ... </div>
     <script type="application/json" class="cpcc-ticket-bank" data-ticket="t1">
       [ { "step": "Step 1 &mdash; Identify the problem",
           "exhibit": "Exhibit A",
           "q": "Question text",
           "opts": [["Correct choice", true], ["Wrong", false], ... six in all ] } ]
     <\/script>
   The bank may also be one page-level script holding an object keyed by
   ticket id: <script type="application/json" class="cpcc-ticket-bank">{"t1":[...],"t2":[...]}<\/script>
   ========================================================================== */
(function () {
    'use strict';

    var CPCC = window.CPCC = window.CPCC || {};
    var LETTERS = 'ABCDEFGH';
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }

    function banks(root) {
        var out = {};
        $all('script.cpcc-ticket-bank', root).forEach(function (s) {
            var data;
            try { data = JSON.parse(s.textContent); } catch (e) { return; }
            if (Array.isArray(data)) out[s.getAttribute('data-ticket')] = data;
            else Object.keys(data).forEach(function (k) { out[k] = data[k]; });
        });
        return out;
    }

    function render(box, items) {
        var solId = box.getAttribute('data-solution');
        var sol = solId ? document.getElementById(solId) : null;
        if (sol) { sol.classList.remove('toc-expanded'); delete sol.dataset.earned; }
        box.innerHTML = '<h3>Questions</h3>';
        box.dataset.correct = '0'; box.dataset.answered = '0';

        items.forEach(function (item, qi) {
            var order = shuffle(item.opts.map(function (_, i) { return i; }));
            var block = document.createElement('div');
            block.className = 'question-block question-block--stateful';
            var html = '<div class="question-number">Question ' + (qi + 1) + ' &middot; ' + item.step + ' &middot; ' + item.exhibit + '</div>';
            html += '<p class="question-text">' + item.q + '</p><ul class="mc-options">';
            order.forEach(function (oi, k) {
                html += '<li><button type="button" class="mc-option" data-oi="' + oi + '"><span class="mc-letter">' + LETTERS[k] + '</span><span>' + item.opts[oi][0] + '</span></button></li>';
            });
            html += '</ul><div class="ticket-feedback"></div>';
            block.innerHTML = html;
            $all('.mc-option', block).forEach(function (btn) {
                btn.addEventListener('click', function () { answer(box, block, item, parseInt(btn.getAttribute('data-oi'), 10), items.length, sol); });
            });
            box.appendChild(block);
        });

        var reset = document.createElement('button');
        reset.type = 'button'; reset.className = 'btn-reset'; reset.textContent = 'Reset These Questions';
        reset.addEventListener('click', function () { render(box, items); });
        box.appendChild(reset);
    }

    function answer(box, block, item, chosen, total, sol) {
        if (block.dataset.done) return;
        block.dataset.done = '1';
        var isRight = item.opts[chosen][1] === true;
        // Mark only the student's own choice. The correct answer is never revealed.
        $all('.mc-option', block).forEach(function (btn) {
            btn.disabled = true;
            if (parseInt(btn.getAttribute('data-oi'), 10) === chosen) btn.classList.add(isRight ? 'graded-correct' : 'graded-incorrect');
        });
        var fb = block.querySelector('.ticket-feedback');
        fb.innerHTML = isRight
            ? '<div class="callout callout-tip"><div class="callout-title">Correct</div><div class="callout-content"><p>That is the call a technician would make here.</p></div></div>'
            : '<div class="callout callout-warning"><div class="callout-title">Incorrect</div><div class="callout-content"><p>Go back to the call and the exhibit named in this question and work out why. Reset These Questions clears the ticket when you are ready to try again.</p></div></div>';
        box.dataset.answered = String(parseInt(box.dataset.answered, 10) + 1);
        if (isRight) box.dataset.correct = String(parseInt(box.dataset.correct, 10) + 1);
        if (parseInt(box.dataset.correct, 10) === total && sol) {
            if (CPCC.openSolution) CPCC.openSolution(sol);
            else { sol.dataset.earned = '1'; sol.classList.add('toc-expanded'); }
        }
    }

    CPCC.initTickets = function (root) {
        var all = banks(root);
        $all('.ticket-questions', root).forEach(function (box) {
            if (box.dataset.cpccReady) return;
            box.dataset.cpccReady = '1';
            var items = all[box.getAttribute('data-ticket')];
            if (!items) { box.innerHTML = '<div class="callout callout-danger"><div class="callout-title">Ticket Not Available</div><div class="callout-content"><p>No question bank was found for ticket "' + box.getAttribute('data-ticket') + '".</p></div></div>'; return; }
            render(box, items);
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CPCC.initTickets(); });
    else CPCC.initTickets();
})();
