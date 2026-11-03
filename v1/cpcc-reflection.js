/* ==========================================================================
   CPCC COURSE DESIGN — https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-reflection.js
   Companion to https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-course-design.css. Plain JavaScript, no libraries.

   The Kolb reflection page: live word counts, a print-to-PDF button, and a
   print-only copy of the responses that is filled in at the moment of
   printing. Generalized from the A+ Core 2 Unit 1 reflection page so that
   a unit with an extra prompt (the Unit 3 workload check-in) needs no
   script edit — the prompts are discovered from the markup.

     <form class="reflection-form" data-reflection
           data-print-title="Unit 1 Reflection"
           data-print-assignment="Unit 1 Reflection Activity &mdash; NET-ITS7512-80">
       <div class="field-group">
         <label class="field-label" for="studentName">Your Name</label>
         <input type="text" id="studentName" class="field-input" data-reflection-name>
       </div>
       <div class="prompt-block">
         <div class="prompt-stage">Concrete Experience</div>
         <p class="prompt-text">Describe one specific moment ...</p>
         <textarea class="prompt-textarea" data-prompt="CE"></textarea>
         <div class="word-count"></div>
       </div>
       ... one .prompt-block per prompt ...
       <div class="form-controls"><button type="button" class="btn-print" data-reflection-print>Print</button></div>
       <div class="empty-warning"></div>
       <div class="print-instructions"></div>
     </form>

   The print-only view (div.print-only) is generated automatically from the
   prompt-stage and prompt-text of each block, so the printed PDF always
   matches the page. The .print-only / body.page--print-summary rules in
   https://mark-at-cpcc.github.io/cpcc-course-design/v1/cpcc-course-design.css do the rest.
   ========================================================================== */
(function () {
    'use strict';

    var CPCC = window.CPCC = window.CPCC || {};
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function countWords(text) { var t = text.trim(); return t === '' ? 0 : t.split(/\s+/).length; }

    CPCC.initReflections = function (root) {
        $all('[data-reflection]', root).forEach(function (form) {
            if (form.dataset.cpccReady) return;
            form.dataset.cpccReady = '1';
            document.body.classList.add('page--print-summary');

            var blocks = $all('.prompt-block', form);
            var nameField = form.querySelector('[data-reflection-name]');
            var printBtn = form.querySelector('[data-reflection-print]');
            var warning = form.querySelector('.empty-warning');
            var instructions = form.querySelector('.print-instructions');

            if (warning && !warning.textContent.trim()) warning.textContent = 'Your name and at least one prompt are still blank. You can still print, but an empty reflection will not earn credit — go back and fill in your responses first.';
            if (instructions && !instructions.innerHTML.trim()) instructions.innerHTML = '<p><strong>The print dialog just opened.</strong> To save this as a PDF instead of sending it to a printer:</p><ul><li>In the <strong>Destination</strong> (or <strong>Printer</strong>) dropdown, choose <strong>Save as PDF</strong> — on Windows this may be listed as <strong>Microsoft Print to PDF</strong></li><li>Click <strong>Save</strong> and choose where to keep the file</li><li>Upload that PDF to the submission link in Brightspace</li></ul>';

            // Live word counts
            blocks.forEach(function (block) {
                var ta = block.querySelector('textarea');
                var counter = block.querySelector('.word-count');
                if (!ta || !counter) return;
                var update = function () { var n = countWords(ta.value); counter.textContent = n + (n === 1 ? ' word' : ' words'); };
                ta.addEventListener('input', update); update();
            });

            // Print-only view, built once from the prompts on the page
            var view = document.createElement('div');
            view.className = 'print-only';
            view.innerHTML = '<h2>' + (form.getAttribute('data-print-title') || 'Reflection') + '</h2>' +
                '<p><strong>Name:</strong> <span data-print-name></span></p>' +
                '<p><strong>Assignment:</strong> ' + (form.getAttribute('data-print-assignment') || '') + '</p>' +
                '<p><strong>Due:</strong> See the Course Schedule</p>';
            blocks.forEach(function (block, i) {
                var stage = block.querySelector('.prompt-stage');
                var text = block.querySelector('.prompt-text');
                var h = document.createElement('h3');
                h.innerHTML = (stage ? stage.innerHTML + ' — ' : '') + (text ? text.innerHTML : 'Prompt ' + (i + 1));
                var p = document.createElement('p'); p.setAttribute('data-print-answer', String(i));
                view.appendChild(h); view.appendChild(p);
            });
            form.parentNode.insertBefore(view, form.nextSibling);

            function sync() {
                view.querySelector('[data-print-name]').textContent = (nameField && nameField.value.trim()) || '(name not entered)';
                blocks.forEach(function (block, i) {
                    var ta = block.querySelector('textarea');
                    view.querySelector('[data-print-answer="' + i + '"]').textContent = (ta && ta.value.trim()) || '(no response entered)';
                });
            }
            function hasEmpty() {
                if (!nameField || !nameField.value.trim()) return true;
                return blocks.some(function (block) { var ta = block.querySelector('textarea'); return !ta || ta.value.trim() === ''; });
            }

            if (printBtn) printBtn.addEventListener('click', function () {
                if (warning) warning.classList.toggle('show', hasEmpty());
                sync();
                // Force layout so the print snapshot sees the text just written
                // into the print-only container (it is display:none on screen).
                void view.offsetHeight;
                if (instructions) instructions.classList.add('show');
                window.setTimeout(function () { window.print(); }, 50);
            });
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { CPCC.initReflections(); });
    else CPCC.initReflections();
})();
