'use strict';

const dragster = require('dragsterjs');

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
        this.searchQueue = [];

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
        this.bindDragEvents();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
        this.bindButtonClicks();
    }

    bindDragEvents() {
        this.bindVariableDragEvents();
    }

    bindVariableDragEvents() {
        this.dragVarsToQueue = new window.Dragster({
            elementSelector: '.dragster-block',
            regionSelector: '.dragster-region',
            updateRegionsHeight: false
        });
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
            queueItemList = this.getElement('#searchQueueContainer'),
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

    bindButtonClicks() {
        const txtNewVar = this.getElement('#txtNewVar'),
            txtNewExpression = this.getElement('#txtNewExpression');

        this.getElement('#btnAddVar').addEventListener('click', (e) => {
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
        // @todo load queue from file

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

        span.classList.add('nav-group-item', 'dragster-block');

        if (this.navVarList.children.length === 0) {
            span.classList.add('active');
            this.displayVariableExpressions(searchVar);

            this.activerVar = span;
        }

        span.textContent = searchVar;

        this.navVarList.appendChild(span);

        this.bindVariableClickEvent(span);

        this.dragVarsToQueue.update();
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
            queueItems = this.getElement('#searchQueueContainer').children,
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
     * @param Node a
     * @param Node b
     * @return bool
     */
    isBefore(a, b) {
        if (a.parentNode !== b.parentNode) {
            return false;
        }

        for (var cur = a; cur; cur = cur.previousSibling) {
            if (cur === b) {
                return true;
            }
        }

        return false;
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
}
