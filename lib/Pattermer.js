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
        this.searchQueue = ['d'];

        this.regexpList = this.getElement('#regexpItems');
        this.navVarList = this.getElement('#navigationVariables');

        this.activerVar = null;

        this.loadSearchVariables();
        this.loadSearchQueue();
        this.bindUIEvents();

        console.log('Program initialised');
    }

    // BINDING METHODS

    bindUIEvents() {
        this.bindVariableDragEvents();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
        this.bindButtonPresses();
    }

    bindVariableDragEvents() {
        const navVarList = this.getElement('#navigationVariables'),
            varPane = this.getElement('#varPane'),
            queue = this.getElement('#searchQueueContainer');

        let dragOrigin;

        // "Variables to search queue" drags
        navVarList.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('itemText', e.target.textContent);
            e.dataTransfer.effectAllowed = 'copy';

            dragOrigin = navVarList;

            queue.classList.add('dropZoneWaiting');
        });

        navVarList.addEventListener('dragend', (e) => {
            queue.classList.remove('dropZoneWaiting');

            dragOrigin = null;
        });

        queue.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';

            if (dragOrigin === navVarList) {
                queue.classList.add('dropZoneActive');
            }
        });

        queue.addEventListener('dragleave', (e) => {
            if (dragOrigin === navVarList) {
                queue.classList.remove('dropZoneActive');
            }
        });

        queue.addEventListener('drop', (e) => {
            if (dragOrigin === navVarList) {
                this.addQueueItem(e.dataTransfer.getData('itemText'));
            }
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

    /**
     * @var Node varElement
     */
    bindVariableClickEvent(varElement) {
        varElement.addEventListener('click', (e) => {
            this.displayVariableExpressions(varElement.textContent);

            if (this.activerVar) {
                this.activerVar.classList.remove('active');
            }

            e.currentTarget.classList.add('active');

            this.activerVar = varElement;
        });
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

                this.expressions[newVar].push(newExpression);
                this.searchVars.push(newVar);

                this.addSearchVariableItem(newVar);
            } else {
                this.expressions[newVar].push(newExpression);

                if (this.activerVar.textContent === newVar) {
                    this.addVariableExpression(newExpression);
                }
            }

            txtNewVar.value = '';
            txtNewExpression.value = '';
        });
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

    loadSearchVariables() {
        for (const searchVar of this.searchVars) {
            this.addSearchVariableItem(searchVar);
        }

        console.log('Search variables loaded');
    }

    // UI EFFECT METHODS

    /**
     * @param string searchVar
     */
    addSearchVariableItem(searchVar) {
        const span = document.createElement('span');

        span.classList.add('nav-group-item');

        if (this.navVarList.children.length === 0) {
            span.classList.add('active');
            this.displayVariableExpressions(searchVar);

            this.activerVar = span;
        }

        span.setAttribute('draggable', 'true');
        span.textContent = searchVar;

        this.navVarList.appendChild(span);

        this.bindVariableClickEvent(span);
    }

    /**
     * @param string itemText
     */
    addQueueItem(itemText) {
        const queueItemList = this.getElement('#queueItems'),
            li = document.createElement('li');

        li.textContent = itemText;

        queueItemList.appendChild(li);
    }

    /**
     * @param string expression
     */
     addVariableExpression(expression) {
        const li = document.createElement('li');

        li.textContent = expression;

        this.regexpList.appendChild(li);
     }

    /**
     * @param string varKey
     */
    displayVariableExpressions(varKey) {
        while (this.regexpList.lastChild)  {
            this.regexpList.removeChild(this.regexpList.lastChild);
        }

        for (const expression of this.expressions[varKey]) {
            this.addVariableExpression(expression);
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

        // @todo Move to a separate function
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

    // UI UTIL METHODS

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
     * Finds all matching elements and returns them in an Array because for-of
     * loops would not work for NodeList objects at the time of writing
     *
     * @param string selector
     * @return Array
     *
     * @todo Drop array conversion when for-of loops are supported for NodeLists
     */
    getElements(selector) {
        return Array.prototype.slice.call(document.querySelectorAll(selector));
    }
}
