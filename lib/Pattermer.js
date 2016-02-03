'use strict';

module.exports.Pattermer = class
{
    run() {
        this.scrollbarFixWidth = 1;

        // Dummy content
        this.searchVars = [];
        this.expressions = {};
        this.files = [
            'Photography-2005-Inc_-_Photosession_2005-01.jpg',
            'Photography-2005-Inc_-_Photosession_2005-02.jpg'
        ];
        this.searchQueue = ['author', 'title', 'year', 'location', 'number'];

        this.regexpList = this.getElement('#regexpItems');
        this.navVarList = this.getElement('#navigationVariables');

        this.previousActiveVar = null;

        this.loadSearchVariables();
        this.loadSearchQueue();
        this.bindUIEvents();

        console.log('Program initialised');
    }

    // BINDING METHODS

    bindUIEvents() {
        this.bindVariableClickEvents();
        this.bindVariableDragEvents();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
        this.bindButtonPresses();
    }

    bindVariableClickEvents() {
        const navVarItems = this.getElements('#navigationVariables > .nav-group-item');

        for (var varItem of navVarItems) {
            varItem.addEventListener('click', (e) => {
                this.displayVariableExpressions(e.currentTarget.textContent);

                this.previousActiveVar.classList.remove('active');
                e.currentTarget.classList.add('active');

                this.previousActiveVar = e.currentTarget;
            });
        }
    }

    bindVariableDragEvents() {
        const navVarList = this.getElement('#navigationVariables'),
            varPane = this.getElement('#varPane'),
            queue = this.getElement('#searchQueueContainer');

        // "Variables to search queue" drags
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

        // "Search queue reordering" drag

        // "Regexp reordering" drags
    }

    bindFileListUpdates() {
        const renamePattern = this.getElement('#txtRenamePattern');

        renamePattern.addEventListener('keyup', () => this.updateFilenamePreview(renamePattern.value));
        renamePattern.addEventListener('input', () => this.updateFilenamePreview(renamePattern.value));
    }

    bindScrollbarChecks() {
        const regexpList = this.getElement('#regexpItems'),
            regexpPane = this.getElement('#regexpPane'),
            navVarList = this.getElement('#navigationVariables'),
            varPane = this.getElement('#varPane'),
            queueItemList = this.getElement('#queueItems'),
            queuePane = this.getElement('#queuePane');

        this.panes = [regexpPane, varPane, queuePane];

        this.bindPaneScrollbarCheck(regexpPane, regexpList);
        this.bindPaneScrollbarCheck(varPane, navVarList);
        this.bindPaneScrollbarCheck(queuePane, queueItemList);

        window.addEventListener('resize', (e) => {
            if (this.previousHeight !== window.outerHeight) {
                this.previousHeight = window.outerHeight;

                this.applyScrollbarWidthFix(regexpPane);
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
        const queueItemList = this.getElement('#queueItems');

        for (const searchVar of this.searchQueue) {
            const li = document.createElement('li');

            li.setAttribute('draggable', 'true');
            li.textContent = searchVar;

            queueItemList.appendChild(li);
        }

        console.log('Search queue loaded');
    }

    bindButtonPresses() {
        const btnAddVar = this.getElement('#btnAddVar'),
            txtNewVar = this.getElement('#txtNewVar'),
            txtNewExpression = this.getElement('#txtNewExpression');

        btnAddVar.addEventListener('click', (e) => {
            e.preventDefault();

            if (!txtNewVar.value || !txtNewExpression.value) {
                return;
            }

            const newVar = txtNewVar.value,
                newExpression = txtNewExpression.value;

            if (!this.expressions[newVar]) {
                this.expressions[newVar] = [];
            }

            this.expressions[newVar].push(newExpression);

            this.searchVars.push(newVar);

            this.addSearchVarItem(newVar);

            txtNewVar.value = '';
            txtNewExpression.value = '';
        });
    }

    loadSearchVariables() {
        for (const searchVar of this.searchVars) {
            this.addSearchVarItem(searchVar)
        }

        console.log('Search variables loaded');
    }

    // UI EFFECT METHODS

    /**
     * @param string searchVar
     */
    addSearchVarItem(searchVar) {
        const span = document.createElement('span');

        span.classList.add('nav-group-item');

        if (this.navVarList.length === 0) {
            span.classList.add('active');
            this.displayVariableExpressions(searchVar);

            this.previousActiveVar = span;
        }

        span.setAttribute('draggable', 'true');
        span.textContent = searchVar;

        this.navVarList.appendChild(span);
    }

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
    updateFilenamePreview(pattern) {
        if (!pattern) {
            return;
        }

        const previewTable = this.getElement('#previewTable'),
            queueItems = this.getElements('#queueItems > li'),
            newFilenames = [];

        if (queueItems.length === 0) {
            return;
        }

        for (const filename of this.files) {
            const replacements = {};

            let matchTarget = filename,
                newFilename = pattern;

            for (const queueItem of queueItems) {
                const varPattern = queueItem.textContent;

                for (const varRegexp of this.expressions[varPattern]) {
                    const re = new RegExp(varRegexp),
                        matches = re.exec(matchTarget);

                    if (matches !== null) {
                        replacements[varPattern] = matches[0];

                        matchTarget = matchTarget.replace(re, '');

                        break;
                    }
                }
            }

            for (const varPattern in replacements) {
                newFilename = newFilename.replace('%' + varPattern + '%', replacements[varPattern]);
            }

           newFilenames.push(newFilename);
        }

        this.displayFilenamePreviewItems(newFilenames);
    }

    /**
     * @param Array fileNames
     */
    displayFilenamePreviewItems(newFilenames) {
        const tBody = this.getElement('#previewTable > tbody');

        while (tBody.lastChild)  {
            tBody.removeChild(tBody.lastChild);
        }

        for (const filename of newFilenames) {
            const tr = document.createElement('tr'),
                td = document.createElement('td');

            td.textContent = filename;

            tr.appendChild(td);
            tBody.appendChild(tr);
        }
    }

    /**
     * Applies a margin fix to an element when it has a visible scrollbar
     *
     * In addition forceful repaints to panes are executed to fix scenarios
     * where panes appear with extra margin
     *
     * @param Node element
     */
    applyScrollbarWidthFix(element) {
        if (element.scrollHeight > element.clientHeight) {
            const style = getComputedStyle(element),
                borderWidth = parseInt(style.borderLeftWidth) + parseInt(style.borderRightWidth),
                marginRight = element.offsetWidth - (element.clientWidth + borderWidth + this.scrollbarFixWidth);

            element.style['margin-right'] = marginRight + 'px';
        } else {
            element.style['margin-right'] = 0;
        }

        for (const pane of this.panes) {
            this.forceRepaint(pane);
        }
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

    // GETTER METHODS

    /**
     * @param string selector
     * @return Node
     */
    getElement(selector) {
        return document.querySelector(selector);
    }

    /**
     * @param string selector
     * @return Array
     */
    getElements(selector) {
        return Array.prototype.slice.call(document.querySelectorAll(selector));
    }
}
