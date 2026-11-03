/* ==========================================================================
   CPCC COURSE DESIGN — cpcc-order.js
   Companion to cpcc-course-design.css. Plain JavaScript, no libraries.

   An ordering item (Design Idea P6): the student puts shuffled steps into
   the correct sequence by clicking them in order, then checks. Used for
   the DHCP DORA exchange, the seven troubleshooting steps, and any other
   sequence the exam presents as a performance-based question.

     <div class="cpcc-order" data-title="Put the DHCP exchange in order"
          data-perfect="That is DORA.">
       <script type="application/json" class="cpcc-order-bank">
         ["Discover", "Offer", "Request", "Acknowledge"]
       </script>
     </div>

   The array is the correct order. The engine shuffles it, numbers each
   click, and on Check marks each item right (graded-correct) or wrong
   (graded-incorrect) by position. Reset reshuffles. Ungraded; records nothing.
   ========================================================================== */
(function () {
    'use strict';
    var CPCC = window.CPCC = window.CPCC || {};
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

    function build(box, steps) {
        box.innerHTML = '';
        var block = el('div', 'question-block question-block--stateful');
        block.appendChild(el('div', 'question-number', 'Ordering item'));
        block.appendChild(el('p', 'question-text', box.getAttribute('data-title') || 'Click the steps in the correct order.'));
        var list = el('ul', 'mc-options'); var picks = [];
        var order = shuffle(steps.map(function (s, i) { return i; }));
        order.forEach(function (idx) {
            var li = el('li'); var btn = el('button', 'mc-option'); btn.type = 'button';
            var badge = el('span', 'mc-letter', '&nbsp;'); btn.appendChild(badge); btn.appendChild(el('span', '', steps[idx]));
            btn.addEventListener('click', function () {
                if (block.dataset.graded || btn.classList.contains('selected')) return;
                picks.push(idx); btn.classList.add('selected'); badge.textContent = String(picks.length);
            });
            li.appendChild(btn); list.appendChild(li);
        });
        block.appendChild(list);
        var controls = el('div', 'assessment-controls');
        var check = el('button', 'btn-grade', 'Check Order'); check.type = 'button';
        var reset = el('button', 'btn-reset', 'Reset'); reset.type = 'button';
        controls.appendChild(check); controls.appendChild(reset); block.appendChild(controls);
        var result = el('p', 'unanswered-note', ''); block.appendChild(result);
        check.addEventListener('click', function () {
            if (picks.length < steps.length) { result.textContent = 'Click every step before checking — ' + (steps.length - picks.length) + ' left.'; return; }
            block.dataset.graded = '1'; var right = 0;
            $all('.mc-option', list).forEach(function (b) {
                var n = parseInt(b.querySelector('.mc-letter').textContent, 10); var idx = picks[n - 1];
                var ok = (idx === n - 1); if (ok) right++;
                b.classList.remove('selected'); b.classList.add(ok ? 'graded-correct' : 'graded-incorrect'); b.disabled = true;
            });
            result.textContent = right === steps.length ? (box.getAttribute('data-perfect') || 'Correct order.') : right + ' of ' + steps.length + ' in the right position. Reset and try again — say each step out loud as you click it.';
        });
        reset.addEventListener('click', function () { build(box, steps); });
        box.appendChild(block);
    }

    CPCC.initOrders = function (root) {
        $all('.cpcc-order', root).forEach(function (box) {
            if (box.dataset.cpccReady) return; box.dataset.cpccReady = '1';
            var s = box.querySelector('script.cpcc-order-bank'); if (!s) return;
            try { build(box, JSON.parse(s.textContent)); } catch (e) { box.innerHTML = '<div class="callout callout-danger"><div class="callout-content"><p>The ordering item could not be read.</p></div></div>'; }
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CPCC.initOrders(); }); else CPCC.initOrders();
})();
