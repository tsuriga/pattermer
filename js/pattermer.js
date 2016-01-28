'use strict';

class Pattermer
{
    run() {
        this.bindDragEvents();
    }

    bindDragEvents() {
        const navVariables = document.querySelector('#navVariables'),
            cntSearchQueue = document.querySelector('#searchQueueContainer');

        navVariables.addEventListener('dragstart', function (e) {
            cntSearchQueue.classList.add('dropZoneWaiting');
        });

        navVariables.addEventListener('dragend', function (e) {
            cntSearchQueue.classList.remove('dropZoneWaiting');
        });

        cntSearchQueue.addEventListener('dragover', function (e) {
            cntSearchQueue.classList.add('dropZoneActive');
        });

        cntSearchQueue.addEventListener('dragleave', function (e) {
            cntSearchQueue.classList.remove('dropZoneActive');
        });
    }
}
