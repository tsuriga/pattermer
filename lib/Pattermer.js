'use strict';

const fs = require('fs'),
    path = require('path'),
    Dragster = require('dragster'),
    remote = require('remote'),
    dialog = remote.require('dialog');

module.exports.Pattermer = class
{
    run() {
        this.scrollbarFixWidth = 1;

        // Dummy content
        this.searchVars = [];
        this.regexps = {};
        this.files = [
            'Photography-2005-Inc_-_Photosession_2005-01.jpg',
            'Photography-2005-Inc_-_Photosession_2005-02.jpg'
        ];
        this.searchQueue = [];

        this.regexpList = this.getElement('#regexpItems');
        this.navVarList = this.getElement('#navigationVariables');

        this.activerVar = null;
        this.dragOrigin = null;
        this.queueDragSource = null;

        this.removeQueueItem = false;

        this.presetFilePath = path.join(__dirname, '..', 'data/presets.json');
        this.presets = {};

        this.preloadPresets();
        this.bindUIEvents();
        this.savePresets();

        console.log('Program initialised');
    }

    // BINDING METHODS

    bindUIEvents() {
        this.bindDrags();
        this.bindFileListUpdates();
        this.bindScrollbarChecks();
        this.bindButtonClicks();
    }

    bindDrags() {
        this.bindRegexpDrags();
        this.bindVariablePanelDrags();
        this.bindQueuePanelDrags();
    }

    bindRegexpDrags() {
        const regexpList = this.getElement('#regexpItems');

        regexpList.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('draggedItem');

            this.dragOrigin = regexpList;
            this.queueDragSource = e.target;
        });

        regexpList.addEventListener('dragend', (e) => {
            e.target.classList.remove('draggedItem');

            this.dragOrigin = null;
            this.queueDragSource = null;
        });

        regexpList.addEventListener('dragover', (e) => {
            if (this.dragOrigin === regexpList) {
                e.preventDefault();
            }
        });
    }

    bindVariablePanelDrags() {
        const queue = this.getElement('#searchQueueContainer'),
            queueItemList = this.getElement('#queueItems'),
            navVarList = this.getElement('#navigationVariables'),
            varPane = this.getElement('#varPane');

        this.dragsterVarsToQueue = new Dragster(queue);

        navVarList.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('itemText', e.target.textContent);
            e.dataTransfer.effectAllowed = 'copy';

            this.dragOrigin = navVarList;

            queue.classList.add('dropzoneWaiting');
        });

        navVarList.addEventListener('dragend', (e) => {
            queue.classList.remove('dropzoneWaiting', 'dropzoneActive');

            this.dragOrigin = null;
        });

        queue.addEventListener('dragster:enter', (e) => {
            if (this.dragOrigin === navVarList) {
                queue.classList.add('dropzoneActive');
            } else if (this.dragOrigin === queueItemList) {
                this.removeQueueItem = false;
            }
        });

        queue.addEventListener('dragover', (e) => {
            if (this.dragOrigin === navVarList) {
                e.preventDefault();
            }
        });

        queue.addEventListener('dragster:leave', (e) => {
            if (this.dragOrigin === navVarList) {
                queue.classList.remove('dropzoneActive');
            } else if (this.dragOrigin === queueItemList) {
                this.removeQueueItem = true;
            }
        });

        queue.addEventListener('drop', (e) => {
            if (this.dragOrigin === navVarList) {
                this.addQueueItem(e.dataTransfer.getData('itemText'));
            }
        });
    }

    bindQueuePanelDrags() {
        const queue = this.getElement('#searchQueueContainer'),
            queueItemList = this.getElement('#queueItems'),
            navVarList = this.getElement('#navigationVariables');

        queueItemList.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('draggedItem');

            this.dragOrigin = queueItemList;
            this.queueDragSource = e.target;
        });

        queueItemList.addEventListener('dragend', (e) => {
            e.target.classList.remove('draggedItem');

            if (this.removeQueueItem) {
                queueItemList.removeChild(e.target);
            }

            this.dragsterVarsToQueue = this.refreshDropzone(this.dragsterVarsToQueue);

            this.dragOrigin = null;
            this.queueDragSource = null;
        });

        queueItemList.addEventListener('dragover', (e) => {
            if (this.dragOrigin === queueItemList) {
                e.preventDefault();
            }
        });

        navVarList.addEventListener('dragover', (e) => {
            if (this.dragOrigin === queueItemList) {
                e.preventDefault();
            }
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
    bindVariableSelectEvent(varElement) {
        varElement.addEventListener('mousedown', (e) => {
            this.displayVariableExpressions(varElement.textContent);

            if (this.activerVar) {
                this.activerVar.classList.remove('active');
            }

            e.currentTarget.classList.add('active');

            this.activerVar = varElement;
        });
    }

    bindButtonClicks() {
        this.bindAddVariableButton();
        this.bindLoadPresetsButton();
        this.bindSavePresetsButton();
    }

    bindAddVariableButton() {
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

            if (!this.regexps[newVar]) {
                this.regexps[newVar] = [];

                this.regexps[newVar].push(newExpression);
                this.searchVars.push(newVar);

                this.addVariableItem(newVar);
            } else {
                this.regexps[newVar].push(newExpression);

                if (this.activerVar.textContent === newVar) {
                    this.addRegexpItem(newExpression);
                }
            }

            txtNewVar.value = '';
            txtNewExpression.value = '';
        });
    }

    bindLoadPresetsButton() {
        const btnLoadPresets = this.getElement('#btnLoadPresets');

        btnLoadPresets.addEventListener('click', (e) => {
            e.preventDefault();

            const setName = this.prompt('set-name');

            console.log(setName);
        });
    }

    bindSavePresetsButton() {
        const btnSavePresets = this.getElement('#btnSavePresets');

        btnSavePresets.addEventListener('click', (e) => {
            e.preventDefault();

            const setName = this.prompt('set-name');

            console.log(setName);
        });
    }

    // DATA SAVING AND LOADING METHODS

    preloadPresets() {
        try {
            fs.accessSync(this.presetFilePath, fs.F_OK);
        } catch (err) {
            this.presets = {
                sets: {
                    untitled: {
                        variables: {}
                    }
                },
                active_set: 'untitled',
            };

            return;
        }

        try {
            this.presets = JSON.parse(fs.readFileSync(this.presetFilePath, 'utf8'));
        } catch (err) {
            console.error('Error reading the preset file: ' + JSON.stringify(err));

            return;
        }

        console.log('Presets loaded');
    }

    /**
     * @param string setName
     */
    loadPreset(setName) {
        if (!this.presets[setName]) {
            console.error('No presets found by name ' + setName);

            return;
        }

        for (const searchVar of this.searchVars) {
            this.addVariableItem(searchVar);
        }

        console.log('Preset ' + setName + ' loaded');
    }

    savePresets() {
        try {
            fs.writeFileSync(this.presetFilePath, JSON.stringify(this.presets), 'utf8');
        } catch (err) {
            console.error('Error writing the preset file: ' + JSON.stringify(err));
        }
    }

    // UI EFFECT METHODS

    /**
     * @param string itemText
     */
    addRegexpItem(itemText) {
        const regexpList = this.getElement('#regexpItems'),
            li = document.createElement('li');

        li.textContent = itemText;
        li.setAttribute('draggable', true);

        li.addEventListener('dragenter', (e) => {
            if (this.dragOrigin === regexpList) {
                if (this.isBefore(this.queueDragSource, e.target)) {
                    e.target.parentNode.insertBefore(this.queueDragSource, e.target);
                } else {
                    e.target.parentNode.insertBefore(this.queueDragSource, e.target.nextSibling);
                }
            }
        });

        li.addEventListener('mouseenter', (e) => {
            e.target.classList.add('hovered');
        });

        li.addEventListener('mouseleave', (e) => {
            e.target.classList.remove('hovered');
        });

        this.regexpList.appendChild(li);
     }

    /**
     * @param string itemText
     */
    addVariableItem(itemText) {
        const span = document.createElement('span');

        span.classList.add('nav-group-item');

        if (this.navVarList.children.length === 0) {
            span.classList.add('active');
            this.displayVariableExpressions(itemText);

            this.activerVar = span;
        }

        span.textContent = itemText;
        span.setAttribute('draggable', true);

        this.navVarList.appendChild(span);

        this.bindVariableSelectEvent(span);
    }

    /**
     * @param string itemText
     */
    addQueueItem(itemText) {
        const queueItemList = this.getElement('#queueItems'),
            li = document.createElement('li');

        li.textContent = itemText;
        li.setAttribute('draggable', true);

        li.addEventListener('dragenter', (e) => {
            if (this.dragOrigin === queueItemList) {
                if (this.isBefore(this.queueDragSource, e.target)) {
                    e.target.parentNode.insertBefore(this.queueDragSource, e.target);
                } else {
                    e.target.parentNode.insertBefore(this.queueDragSource, e.target.nextSibling);
                }
            }
        });

        li.addEventListener('mouseenter', (e) => {
            e.target.classList.add('hovered');
        });

        li.addEventListener('mouseleave', (e) => {
            e.target.classList.remove('hovered');
        });

        queueItemList.appendChild(li);

        this.dragsterVarsToQueue = this.refreshDropzone(this.dragsterVarsToQueue);
    }

    /**
     * @param string varKey
     *
     * @todo Optimize by replacing regexpList completely and using DocumentFragment
     */
    displayVariableExpressions(varKey) {
        while (this.regexpList.lastChild)  {
            this.regexpList.removeChild(this.regexpList.lastChild);
        }

        for (const expression of this.regexps[varKey]) {
            this.addRegexpItem(expression);
        }
    }

    /**
     * @param string pattern
     *
     * @todo Optimize by using DocumentFragment
     */
    updateFilenamePreview(pattern) {
        if (!pattern) {
            return;
        }

        const previewTable = this.getElement('#previewTable'),
            queueItems = this.getElements('#queueItems'),
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

                for (const varRegexp of this.regexps[varPattern]) {
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
     *
     * @todo Optimize by replacing tBody completely and using DocumentFragment
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
     * @var string templatePath
     * @return mixed
     */
    prompt(templatePath) {
        return 'NOT IMPLEMENTED';
    }

    // UI UTIL METHODS

    /**
     * Refreshes dropzone listeners on a Dragster object
     *
     * Releases Dragster object's listeners and rebinds them in a new Dragster
     * object for the events to work correctly with the container's new child
     * nodes.
     *
     * @param Dragster
     */
    refreshDropzone(dragster) {
        const container = dragster.el;

        dragster.removeListeners();

        return new Dragster(container);
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
