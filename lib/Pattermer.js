'use strict';

const fs = require('fs'),
    path = require('path'),
    Dragster = require('dragster'),
    remote = require('remote'),
    dialog = remote.require('dialog');

/**
 * @todo Separate into multiple classes
 * @todo Improve error resiliency and messages
 * @todo Add the feature to create a new empty preset set
 * @todo Use more of HTML5 Templates
 * @todo Use more DocumentFragment optimizations
 * @todo Write unit tests
 * @todo Use function parameter default values when they are supported
 */
module.exports.Pattermer = class
{
    run() {
        this.scrollbarFixWidth = 1;

        this.fileList = [];

        this.regexpList = this.getElement('#regexpItems');
        this.navVarList = this.getElement('#navigationVariables');

        this.selectedVar = null; // currently selected variable element
        this.dragOrigin = null; // drag host element
        this.dragSource = null; // element currently being dragged

        this.templates = {}; // loaded templates

        this.cfgFilePath = path.join(__dirname, '..', 'data/config.json');
        this.cfg = {};

        this.currentPreset = {};

        this.loadConfigs();
        this.bindUIEvents();
        this.loadPreset(this.cfg.activePreset);

        console.log('Program initialised');
    }

    // BINDING METHODS

    /**
     * Attaches all UI related events
     */
    bindUIEvents() {
        this.bindDrags();
        this.bindPatternChanges();
        this.bindScrollbarChecks();
        this.bindButtonClicks();
    }

    /**
     * Attaches all drag and drop events
     */
    bindDrags() {
        this.bindRegexpPaneDrags();
        this.bindVariablePaneDrags();
        this.bindQueuePaneDrags();
    }

    /**
     * Attaches dragging events that occur on the regular expressions pane
     */
    bindRegexpPaneDrags() {
        const regexpList = this.getElement('#regexpItems'),
            navVarContainer = this.getElement('#navVarContainer');

        regexpList.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('regexpId', e.target.id);
            e.dataTransfer.effectAllowed = 'move';

            e.target.classList.add('draggedItem');

            navVarContainer.classList.add('dropzoneDelete');

            this.dragOrigin = regexpList;
            this.dragSource = e.target;
        });

        regexpList.addEventListener('dragend', (e) => {
            e.target.classList.remove('draggedItem');

            navVarContainer.classList.remove('dropzoneDelete');

            this.dragOrigin = null;
            this.dragSource = null;
        });

        regexpList.addEventListener('dragover', (e) => {
            if (this.dragOrigin === regexpList) {
                e.preventDefault();
            }
        });
    }

    /**
     * Attaches dragging events that occur from and onto the variable pane
     */
    bindVariablePaneDrags() {
        const queue = this.getElement('#searchQueueContainer'),
            queueItemList = this.getElement('#queueItems'),
            navVarList = this.getElement('#navigationVariables'),
            navVarContainer = this.getElement('#navVarContainer'),
            varPane = this.getElement('#varPane'),
            regexpList = this.getElement('#regexpItems');

        this.createDragsterZone(queue, queueItemList);

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
            }
        });

        queue.addEventListener('drop', (e) => {
            if (this.dragOrigin === navVarList) {
                this.addQueueItem(e.dataTransfer.getData('itemText'));
            }
        });

        navVarContainer.addEventListener('dragover', (e) => {
            if (this.dragOrigin === queueItemList || this.dragOrigin === regexpList) {
                e.preventDefault();
            }
        });

        navVarContainer.addEventListener('drop', (e) => {
            if (this.dragOrigin === queueItemList) {
                queueItemList.removeChild(this.dragSource);
            } else if (this.dragOrigin === regexpList) {
                const index = this.getItemIndex(this.getElement('#' + e.dataTransfer.getData('regexpId')));

                this.currentPreset['variables'][this.selectedVar.textContent].splice(index, 1);

                regexpList.removeChild(this.dragSource);
            }

            navVarContainer.classList.remove('dropzoneDelete');

            this.dragOrigin = null;
            this.dragSource = null;
        });
    }

    /**
     * Attaches dragging events that occur on and from the search queue pane
     */
    bindQueuePaneDrags() {
        const queue = this.getElement('#searchQueueContainer'),
            queueItemList = this.getElement('#queueItems');

        queueItemList.addEventListener('dragstart', (e) => {
            e.target.classList.add('draggedItem');

            this.dragOrigin = queueItemList;
            this.dragSource = e.target;
        });

        queueItemList.addEventListener('dragend', (e) => {
            e.target.classList.remove('draggedItem');

            this.dragOrigin = null;
            this.dragSource = null;
        });

        queueItemList.addEventListener('dragover', (e) => {
            if (this.dragOrigin === queueItemList) {
                e.preventDefault();
            }
        });
    }

    /**
     * Attaches events to update filename previews when rename pattern changes
     */
    bindPatternChanges() {
        const renamePattern = this.getElement('#txtRenamePattern');

        renamePattern.addEventListener('keyup', () => this.updateFilenamePreview(renamePattern.value));
        renamePattern.addEventListener('input', () => this.updateFilenamePreview(renamePattern.value));
    }

    /**
     * Attaches events to make sure scrollbars are accounted for in the UI
     */
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
     * Attaches event to change the current active variable upon pressing one
     *
     * @var Node varElement
     */
    bindVariableSelect(varElement) {
        varElement.addEventListener('mousedown', (e) => {
            this.displayVariableExpressions(varElement.textContent);

            if (this.selectedVar) {
                this.selectedVar.classList.remove('active');
            }

            e.currentTarget.classList.add('active');

            this.selectedVar = varElement;
        });
    }

    /**
     * Attaches all button clicks in the initial UI
     */
    bindButtonClicks() {
        this.bindMenuBarButtons();
        this.bindPaneButtons();
    }

    /**
     * Attaches events for buttons in the main menu bar
     */
    bindMenuBarButtons() {
        this.bindOpenDirectoryButton();
        this.bindLoadPresetButton();
        this.bindSavePresetButton();
    }

    /**
     * Attaches events that occur for buttons on panes
     */
    bindPaneButtons() {
        this.bindAddVariableButton();
        this.bindRemoveVariableButton();
    }

    /**
     * Attaches event to read filenames in a directory
     */
    bindOpenDirectoryButton() {
        const btnOpenDirectory = this.getElement('#btnOpenDirectory');

        btnOpenDirectory.addEventListener('click', (e) => {
            e.preventDefault();

            const directoryPaths = dialog.showOpenDialog({ properties: ['openDirectory'] });

            if (directoryPaths) {
                const filenameList = fs.readdirSync(directoryPaths[0]);

                this.fileList = [];

                for (const filename of filenameList) {
                    this.fileList.push(path.join(directoryPaths[0], filename));
                }

                this.updateFilenamePreview(this.getElement('#txtRenamePattern').value);
            }
        });
    }

    /**
     * Attaches events for variable addition feature
     */
    bindAddVariableButton() {
        const txtNewVar = this.getElement('#txtNewVar'),
            txtNewExpression = this.getElement('#txtNewExpression');

        this.getElement('#btnAddVar').addEventListener('click', (e) => {
            e.preventDefault();

            if (!txtNewVar.value || !txtNewExpression.value) {
                return;
            }

            const newVar = txtNewVar.value,
                newExpression = txtNewExpression.value;

            if (!this.currentPreset['variables'][newVar]) {
                this.currentPreset['variables'][newVar] = [];

                this.currentPreset['variables'][newVar].push(newExpression);

                this.addVariableItem(newVar);
            } else {
                this.currentPreset['variables'][newVar].push(newExpression);

                if (this.selectedVar.textContent === newVar) {
                    this.addRegexpItem(newExpression);
                }
            }

            txtNewVar.value = '';
            txtNewExpression.value = '';
        });
    }

    /**
     * Attaches event to remove the currently selected variable
     */
    bindRemoveVariableButton() {
        this.getElement('#btnRemoveVar').addEventListener('click', (e) => {
            e.preventDefault();

            if (!this.selectedVar) {
                return;
            }

            const varToRemove = this.selectedVar;

            if (this.selectedVar.previousElementSibling) {
                this.selectedVar = this.selectedVar.previousElementSibling;
            } else if (this.selectedVar.nextElementSibling) {
                this.selectedVar = this.selectedVar.nextElementSibling;
            } else {
                this.selectedVar = null;
            }

            delete(this.currentPreset['variables'][varToRemove.textContent]);
            varToRemove.parentNode.removeChild(varToRemove);

            if (this.selectedVar) {
                this.selectedVar.classList.add('active');

                this.displayVariableExpressions(this.selectedVar.textContent);
            } else {
                this.displayVariableExpressions();
            }
        });
    }

    /**
     * Attaches event to load a preset
     */
    bindLoadPresetButton() {
        this.getElement('#btnLoadPreset').addEventListener('click', (e) => {
            e.preventDefault();

            this.prompt('loadPreset', (formData) => {
                this.loadPreset(formData.txtSetName);

                // Save configs to retain the currently active preset for the next time the app is started
                this.saveConfigs();

                dialog.showMessageBox({
                    message: 'Loading in preset ' + formData.txtSetName,
                    buttons: ['OK']
                });
            });
        });
    }

    /**
     * Attaches event to save a preset
     */
    bindSavePresetButton() {
        this.getElement('#btnSavePreset').addEventListener('click', (e) => {
            e.preventDefault();

            this.prompt('savePreset', (formData) => {
                this.cfg.activePreset = formData.txtSetName;
                this.cfg.presets[formData.txtSetName] = this.clone(this.currentPreset);
                this.readQueueOrder();

                this.saveConfigs();

                dialog.showMessageBox({
                    message: 'Preset ' + formData.txtSetName + ' has been saved',
                    buttons: ['OK']
                });

                console.log('Preset ' + formData.txtSetName + ' saved');
            });
        });
    }

    // DATA SAVING AND LOADING METHODS

    /**
     * Attempts to load in configurations from a JSON file
     */
    loadConfigs() {
        try {
            fs.accessSync(this.cfgFilePath, fs.F_OK);
        } catch (err) {
            this.cfg = {
                presets: {
                    untitled: {
                        variables: {},
                        queue: []
                    }
                },
                activePreset: 'untitled',
            };

            return;
        }

        let cfgFileContents = '';

        try {
            cfgFileContents = fs.readFileSync(this.cfgFilePath, 'utf8');
        } catch (err) {
            console.error('Error reading the configuration file: ' + JSON.stringify(err));

            return;
        }

        try {
            this.cfg = JSON.parse(cfgFileContents);
        } catch (err) {
            console.error('Error parsing the configuration file: ' + err.message);

            return;
        }

        console.log('Configurations loaded');
    }

    /**
     * Attempts to save configurations into a JSON file
     */
    saveConfigs() {
        try {
            fs.writeFileSync(this.cfgFilePath, JSON.stringify(this.cfg), 'utf8');
        } catch (err) {
            console.error('Error writing the configuration file: ' + JSON.stringify(err));
        }
    }

    /**
     * Loads in a preset to the UI
     *
     * @param string presetName
     */
    loadPreset(presetName) {
        if (!this.cfg.presets[presetName]) {
            console.error('No preset found by name ' + presetName);

            return;
        }

        this.currentPreset = this.clone(this.cfg.presets[presetName]);
        this.cfg.activePreset = presetName;

        const queueItemList = this.getElement('#queueItems');

        while (this.navVarList.lastChild) {
            this.navVarList.removeChild(this.navVarList.lastChild);
        }

        while (queueItemList.lastChild) {
            queueItemList.removeChild(queueItemList.lastChild);
        }

        for (const searchVar in this.currentPreset['variables']) {
            this.addVariableItem(searchVar);
        }

        for (const queueVar of this.currentPreset['queue']) {
            this.addQueueItem(queueVar);
        }

        this.updateFilenamePreview(this.getElement('#txtRenamePattern').value);

        console.log('Preset ' + presetName + ' loaded');
    }

    // UI EFFECT METHODS

    /**
     * Adds a regular expression list item to their host container
     *
     * @param string itemText
     */
    addRegexpItem(itemText) {
        const regexpList = this.getElement('#regexpItems'),
            newId = 'reItem-' + (regexpList.lastChild ? parseInt(regexpList.lastChild.id.split('-')[1]) + 1 : 0),
            li = document.createElement('li');

        li.textContent = itemText;
        li.setAttribute('draggable', true);
        li.id = newId;

        li.addEventListener('dragenter', (e) => {
            if (this.dragOrigin === regexpList) {
                if (this.isBefore(this.dragSource, e.target)) {
                    e.target.parentNode.insertBefore(this.dragSource, e.target);
                } else {
                    e.target.parentNode.insertBefore(this.dragSource, e.target.nextSibling);
                }

                this.readRegexpOrder();
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
     * Adds a variable list item to their host container
     *
     * @param string itemText
     */
    addVariableItem(itemText) {
        const span = document.createElement('span');

        span.classList.add('nav-group-item');

        if (this.navVarList.children.length === 0) {
            span.classList.add('active');
            this.displayVariableExpressions(itemText);

            this.selectedVar = span;
        }

        span.textContent = itemText;
        span.setAttribute('draggable', true);

        this.navVarList.appendChild(span);

        this.bindVariableSelect(span);
    }

    /**
     * Adds a queue item to their host container
     *
     * @param string itemText
     */
    addQueueItem(itemText) {
        const queueItemList = this.getElement('#queueItems'),
            li = document.createElement('li');

        li.textContent = itemText;
        li.setAttribute('draggable', true);

        li.addEventListener('dragenter', (e) => {
            if (this.dragOrigin === queueItemList) {
                if (this.isBefore(this.dragSource, e.target)) {
                    e.target.parentNode.insertBefore(this.dragSource, e.target);
                } else {
                    e.target.parentNode.insertBefore(this.dragSource, e.target.nextSibling);
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

    }

    /**
     * Shows regular expressions for a specific variable in the expression host container
     *
     * @param string varKey
     *
     * @todo Optimize by replacing regexpList completely and using DocumentFragment
     */
    displayVariableExpressions(varKey) {
        while (this.regexpList.lastChild) {
            this.regexpList.removeChild(this.regexpList.lastChild);
        }

        if (this.currentPreset['variables'][varKey]) {
            for (const expression of this.currentPreset['variables'][varKey]) {
                this.addRegexpItem(expression);
            }
        }
    }

    /**
     * Reconstructs filename preview by applying searches and replacements against
     * the current list of files and displays the list in the preview container
     *
     * @param string pattern
     */
    updateFilenamePreview(pattern) {
        this.displayFilenamePreviewItems(pattern ? this.getTransformedFilenames(pattern) : []);
    }

    /**
     * Shows the list of new filenames in the filename preview host container
     *
     * @param Array newFilenames
     */
    displayFilenamePreviewItems(newFilenames) {
        const tBody = this.getElement('#previewTable > tbody');

        while (tBody.lastChild) {
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
     * Displays a modal window with two potential outcomes - success and cancel.
     * The modal is closed either way but on success the callback function is
     * executed with any form data from the template as its object parameter.
     *
     * @var string templateName
     * @var function successCallback
     */
    prompt(templateName, successCallback) {
        const template = this.getTemplate(templateName);

        if (!template) {
            return;
        }

        this.getElement('#modalWindow').children[0].appendChild(
            document.importNode(template.content, true)
        );

        this.getElement('#btnModalSubmit').addEventListener('click', (e) => {
            e.preventDefault();

            const inputs = this.getElements('#modalWindow input'),
                formData = {};

            for (const input of inputs) {
                formData[input.id] = input.value;
            }

            this.clearModal();

            successCallback(formData);
        });

        this.getElement('#btnModalCancel').addEventListener('click', (e) => {
            e.preventDefault();

            this.clearModal();
        })

        this.showModal();
    }

    /**
     * Shows modal window and focuses to its first input element if any
     */
    showModal() {
        const inputs = this.getElements('#modalWindow input');

        this.getElement('#modalWindow').classList.add('modalVisible');

        if (inputs.length > 0) {
            inputs[0].focus();
        }
    }

    /**
     * Removes modal window's current contents and hides the modal
     */
    clearModal() {
        const modalWindow = this.getElement('#modalWindow'),
            emptyModalInner = document.createElement('div');

        emptyModalInner.classList.add('modalInner');

        modalWindow.replaceChild(emptyModalInner, modalWindow.children[0]);

        modalWindow.classList.remove('modalVisible');
    }

    /**
     * Loads in an HTML5 template element from a file
     *
     * @param string templateName
     * @return Node|null Template node if loading the template succeeded, null otherwise
     */
    getTemplate(templateName) {
        if (this.templates[templateName]) {
            return this.templates[templateName];
        }

        const templatePath = path.join(__dirname, '..', 'template', templateName + '.html');

        try {
            fs.accessSync(templatePath, fs.F_OK);
        } catch (err) {
            console.error('Could not load template ' + templateName);

            return null;
        }

        let fileContents = '';

        try {
            fileContents = fs.readFileSync(templatePath, 'utf8');
        } catch (err) {
            console.error('Error reading template file ' + templateName + ': ' + JSON.stringify(err));

            return null;
        }

        const templateFragment = document.createRange().createContextualFragment(fileContents);

        if (templateFragment.children.length > 0 && templateFragment.children[0].nodeName === 'TEMPLATE') {
            this.templates[templateName] = templateFragment.children[0];

            return templateFragment.children[0];
        }

        return null;
    }

    /**
     * Creates a Dragster enabled dropzone that updates when the monitored node's contents change
     *
     * @param Node dropzone
     * @param Node nodeToMonitor
     */
    createDragsterZone(dropzone, nodeToMonitor) {
        let dragster = new Dragster(dropzone);

        const observer = new MutationObserver(() => dragster = new Dragster(dragster.el));

        // Reset dragster to prevent detection issues after a drop over the monitored node
        nodeToMonitor.addEventListener('drop', () => dragster.reset());

        observer.observe(nodeToMonitor, { childList: true });
    }

    /**
     * Reads the regular expression item order in from expression host container
     */
    readRegexpOrder() {
        const regexpItems = this.getElements('#regexpItems > li');

        this.currentPreset['variables'][this.selectedVar.textContent] = [];

        for (const regexpItem of regexpItems) {
            this.currentPreset['variables'][this.selectedVar.textContent].push(regexpItem.textContent);
        }
    }

    /**
     * Reads the queue order in from queue item host container
     */
    readQueueOrder() {
        const queueItems = this.getElements('#queueItems > li');

        this.currentPreset['queue'] = [];

        for (const queueItem of queueItems) {
            this.currentPreset['queue'].push(queueItem.textContent);
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
     * Determines which one of the given nodes comes first in their host container
     *
     * @param Node a
     * @param Node b
     * @return bool
     */
    isBefore(a, b) {
        if (a.parentNode !== b.parentNode) {
            return false;
        }

        for (var cur = a; cur; cur = cur.previousElementSibling) {
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

    /**
     * Determines how many siblings given node has before it
     *
     * @param Node node
     * @return int
     */
    getItemIndex(node) {
        let i = 0;

        while (node.previousElementSibling) {
            node = node.previousElementSibling;
            i++;
        }

        return i;
    }

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

    /**
     * Returns a deep-copy clone of an object. Geared for objects used as hashmaps
     *
     * @param object obj
     * @return object
     */
    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Applies variable transformations against the current list of files
     * and returns the results
     *
     * @param string pattern
     * @return Array
     */
    getTransformedFilenames(pattern) {
        const queueItems = this.getElements('#queueItems > li'),
            newFilenames = [];

        if (queueItems.length === 0) {
            return [];
        }

        for (const filePath of this.fileList) {
            const extName =  path.extname(filePath),
                replacements = {};

            let matchTarget = path.basename(filePath, extName),
                newFilename = pattern;

            for (const queueItem of queueItems) {
                const varPattern = queueItem.textContent;

                // Select the first match if any to a variable's expressions in the filename
                for (const varRegexp of this.currentPreset['variables'][varPattern]) {
                    const re = new RegExp(varRegexp),
                        matches = re.exec(matchTarget);

                    if (matches !== null) {
                        replacements[varPattern] = matches[0];

                        // Discard the matched section from the search for following variables
                        matchTarget = matchTarget.replace(re, '');

                        break;
                    }
                }

                // If the filename has no matches for any of the expressions, clear the var from filename
                if (!replacements[varPattern]) {
                    replacements[varPattern] = '';
                }
            }

            for (const varPattern in replacements) {
                newFilename = newFilename.replace('%' + varPattern + '%', replacements[varPattern]);
            }

           newFilenames.push(newFilename + extName);
        }

        return newFilenames;
    }
}
