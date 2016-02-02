'use strict';

module.exports.Pattermer = class
{
    run() {
        this.scrollbarFixWidth = 1;

        // Dummy content
        this.searchVars = ['%author%', '%year%', '%location%', '%title%'];
        this.expressions = {
            '%author%': ['(.*)_'],
            '%year%': ['\d{4}'],
            '%location%': ['\[\w+\]', '\(\w+\)', 'Paris'],
            '%title%': ['Photosession']
        };
        this.files = [
            'Photography-2005-Inc_-_Photosession_2005-01.jpg',
            'Photography-2005-Inc_-_Photosession_2005-02.jpg'
        ];
        this.searchQueue = ['%author%', '%title%', '%year%', '%location%'];

        this.regexpList = document.querySelector('#regexpItems');

        this.loadSearchQueue();
        this.loadSearchVariables();
        this.bindUIEvents();
    }

    // BINDING METHODS

    bindUIEvents() {
        this.bindVariableClickEvents();
        this.bindVariableDragEvents();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
    }

    bindVariableClickEvents() {
        const navVarItems = document.querySelectorAll('#navigationVariables > .nav-group-item');

        for (var i = 0; i < navVarItems.length; i++) {
            navVarItems[i].addEventListener('click', (e) =>
                this.displayVariableExpressions(e.currentTarget.textContent)
            );
        }
    }

    bindVariableDragEvents() {
        const navVarList = document.querySelector('#navigationVariables'),
            queue = document.querySelector('#searchQueueContainer');

        // "Variables to search queue" drag
        navVarList.addEventListener('dragstart', function (e) {
            queue.classList.add('dropZoneWaiting');
        });

        navVarList.addEventListener('dragend', function (e) {
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

        renamePattern.addEventListener('keyup', () => this.updateFileNamePreview(renamePattern.value));
    }

    bindScrollbarChecks() {
        const navVarList = document.querySelector('#navigationVariables'),
            varPane = document.querySelector('#varPane'),
            queueItemList = document.querySelector('#queueItems'),
            queuePane = document.querySelector('#queuePane');

        this.bindPaneScrollbarCheck(varPane, navVarList);
        this.bindPaneScrollbarCheck(queuePane, queueItemList);

        window.addEventListener('resize', (e) => {
            // Only apply vertical scrollbar fix if height changes
            if (this.previousHeight !== window.outerHeight) {
                this.previousHeight = window.outerHeight;

                this.applyScrollbarWidthFix(varPane);
                this.applyScrollbarWidthFix(queuePane);
            }
        });
    }

    /**
     * @param Node pane
     * @param Node mutatingElement
     */
    bindPaneScrollbarCheck(pane, mutatingElement) {
        const observer = new MutationObserver(() => this.applyScrollbarWidthFix(pane));

        observer.observe(mutatingElement, { childList: true });
    }

    // DATA LOADING METHODS

    loadSearchQueue() {
        const queueItemList = document.querySelector('#queueItems');

        for (const searchVar of this.searchQueue) {
            const li = document.createElement('li');

            li.setAttribute('draggable', 'true');
            li.textContent = searchVar;

            queueItemList.appendChild(li);
        }

        console.log('Search queue loaded');
    }

    loadSearchVariables() {
        const navVarList = document.querySelector('#navigationVariables');

        let firstItem = true;

        for (const searchVar of this.searchVars) {
            const span = document.createElement('span');

            span.classList.add('nav-group-item');

            if (firstItem) {
                span.classList.add('active');
                this.displayVariableExpressions(searchVar);

                firstItem = false;
            }

            span.setAttribute('draggable', 'true');
            span.textContent = searchVar;

            navVarList.appendChild(span);
        }

        console.log('Search variables loaded');
    }

    // UI EFFECT METHODS

    /**
     * @param string varKey
     */
    displayVariableExpressions(varKey) {
        while (this.regexpList.lastChild)  {
            this.regexpList.removeChild(this.regexpList.lastChild);
        }

        for (const regexp of this.expressions[varKey]) {
            const li = document.createElement('li');

            li.textContent = regexp;

            this.regexpList.appendChild(li);
        }
    }

    /**
     * @param string pattern
     */
    updateFileNamePreview(pattern) {
        if (!pattern) {
            return;
        }

        const previewTable = document.querySelector('#previewTable');

        console.log('Updating file name preview with pattern: ' + pattern);
    }

    /**
     * Applies a margin fix to an element when it has a visible scrollbar
     *
     * @param Node element
     */
    applyScrollbarWidthFix(element) {
        let marginRight = 0;

        if (element.scrollHeight > element.clientHeight) {
            const style = getComputedStyle(element),
                borderWidth = parseInt(style.borderLeftWidth) + parseInt(style.borderRightWidth);

            marginRight = element.offsetWidth - (element.clientWidth + borderWidth + this.scrollbarFixWidth);
        }

        element.style['margin-right'] = marginRight + 'px';

        /* Force a redraw to fix scenarios where a simultaneous horizontal and
         * vertical redraw cause the element to appear with extra margin
         */
        this.forceRepaint(element);
    }

    /**
     * Forces repaint on element by temporarily adjusting its opacity
     *
     * @param Node element
     */
    forceRepaint(element) {
        element.style['opacity'] = 0.99;

        window.setTimeout(() => element.style['opacity'] = 1, 1);
    }
}
