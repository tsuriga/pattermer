'use strict';

module.exports.Pattermer = class
{
    run() {
        this.scrollbarFixWidth = 1;

        this.files = [
            'Photography-2005-Inc_-_Photosession_2005-01.jpg',
            'Photography-2005-Inc_-_Photosession_2005-02.jpg'
        ];

        this.bindUIEvents();
    }

    bindUIEvents() {
        this.bindVariableClickEvents();
        this.bindVariableDragEvents();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
    }

    bindVariableClickEvents() {
        const navVarItems = document.querySelectorAll('#navigationVariables > .nav-group-item');

        for (var i = 0; i < navVarItems.length; i++) {
            navVarItems[i].addEventListener('click', (e) => this.loadVariableRegExp(e.currentTarget.textContent));
        }
    }

    bindVariableDragEvents() {
        const varContainer = document.querySelector('#navigationVariables'),
            queue = document.querySelector('#searchQueueContainer');

        // "Variables to search queue" drag
        varContainer.addEventListener('dragstart', function (e) {
            queue.classList.add('dropZoneWaiting');
        });

        varContainer.addEventListener('dragend', function (e) {
            queue.classList.remove('dropZoneWaiting');
        });

        queue.addEventListener('dragover', function (e) {
            queue.classList.add('dropZoneActive');
        });

        queue.addEventListener('dragleave', function (e) {
            queue.classList.remove('dropZoneActive');
        });
    }

    bindFileListUpdates() {
        const renamePattern = document.querySelector('#txtRenamePattern');

        renamePattern.addEventListener('keyup', () => {
            this.updateFileNamePreview(renamePattern.value)
        });
    }

    bindScrollbarChecks() {
        const navVarList = document.querySelector('#navigationVariables'),
            varPane = document.querySelector('#varPane'),
            observer = new MutationObserver(() => this.applyScrollbarWidthFix(varPane));

        observer.observe(navVarList, { childList: true });

        window.addEventListener('resize', () => this.applyScrollbarWidthFix(varPane));
    }

    loadVariableRegExp(v) {
        console.log('Regexp loaded for variable ' + v);
    }

    updateFileNamePreview(pattern) {
        if (!pattern) {
            return;
        }

        const previewTable = document.querySelector('#previewTable');

        console.log('Updating file name preview with pattern: ' + pattern);
    }

    /**
     * Applies a margin fix to an element when it has a visible scrollbar
     */
    applyScrollbarWidthFix(element) {
        let marginRight = 0;

        if (element.scrollHeight > element.clientHeight) {
            const style = getComputedStyle(element),
                borderWidth = parseInt(style.borderLeftWidth) + parseInt(style.borderRightWidth);

            marginRight = element.offsetWidth - (element.clientWidth + borderWidth + this.scrollbarFixWidth);
        }

        element.style['margin-right'] = marginRight + 'px';

        /* Force a redraw to fix most scenarios where a simultaneous horizontal
         * and vertical redraw cause the element to appear with extra margin
         */
        this.forceRedraw(element);
    }

    /**
     * Forces repaint on element by temporarily adjusting its opacity
     */
    forceRedraw(element) {
        element.style['opacity'] = 0.99;

        window.setTimeout(() => element.style['opacity'] = 1, 1);
    }
}
