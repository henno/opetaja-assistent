import SlimSelect from 'slim-select';
import 'slim-select/dist/slimselect.css';
import AssistentDom from "~src/shared/AssistentDom";
import TahvelDom from "~src/modules/tahvel/TahvelDom";
import type {AssistentLearningOutcomes} from "~src/shared/AssistentTypes";
import Tahvel from "~src/modules/tahvel/index";

class TahvelJournalEntryDialog {
    private static dialog: HTMLElement;
    private static entryNameInput: HTMLInputElement;
    private static entryContentTextarea: HTMLTextAreaElement;
    private static learningOutcomesDropdownContainer: HTMLElement;
    private static learningOutcomesSlimSelect: SlimSelect;
    private static learningOutcomesArray: AssistentLearningOutcomes[];
    private static independentWorkMdCheckbox: HTMLElement;
    private static entryTypeMdSelect: HTMLElement;

    static async initCustomizations() {
        new MutationObserver((mutations) => {
            mutations.forEach(async (mutation) => {
                if (mutation.addedNodes.length > 0) {
                    const addedNode = mutation.addedNodes[0] as HTMLElement;
                    if (addedNode.tagName === 'DIV' && addedNode.classList.contains('md-dialog-container')) {
                        await TahvelJournalEntryDialog.handleDialogMutation(addedNode);
                    }
                }
            });
        }).observe(document.body, {childList: true, subtree: true});
    }

    static updateEntryName() {
        const content = TahvelJournalEntryDialog.entryContentTextarea.value.replace(/\s+/g, ' ').trim().slice(0, 30);
        const ellipsis = TahvelJournalEntryDialog.entryContentTextarea.value.trim().length > 30 ? '...' : '';
        const outcomes = TahvelJournalEntryDialog.independentWorkCheckboxIsChecked() ? TahvelJournalEntryDialog.learningOutcomesSlimSelect.getSelected()
            .map(code => TahvelJournalEntryDialog.learningOutcomesArray.find(o => o.code === code)?.code)
            .join(', ') : '';
        const entryName = `${content}${ellipsis}${outcomes ? ` (${outcomes})` : ''}`;
        TahvelDom.fillTextbox('input[ng-model="journalEntry.nameEt"]', entryName).catch(error => Tahvel.handleError(error));
    }

    private static async handleDialogMutation(dialogContainer: HTMLElement) {
        const checkInterval = setInterval(async () => {
            if (TahvelJournalEntryDialog.isDialogReady(dialogContainer)) {
                clearInterval(checkInterval);
                await TahvelJournalEntryDialog.setupDialog(dialogContainer);
                // Adjust dialog position if it's too low on the screen
                const rect = dialogContainer.getBoundingClientRect();
                if (rect.bottom > window.innerHeight) {
                    dialogContainer.style.top = `${window.innerHeight - rect.height}px`;
                }
            }
        }, 300);
        setTimeout(() => clearInterval(checkInterval), 5000);
    }


    private static isDialogReady(dialogContainer: HTMLElement): boolean {
        return ['Sissekande liik', 'Auditoorne õpe', 'Iseseisev õpe', 'Kodutöö'].every(text => dialogContainer.innerHTML.includes(text));
    }


    private static async setupDialog(dialogContainer: HTMLElement) {
        await AssistentDom.waitForElement('button.md-focused');
        TahvelJournalEntryDialog.dialog = dialogContainer.querySelector('md-dialog') as HTMLElement;
        if (TahvelJournalEntryDialog.dialog.querySelector('#assistent-learning-outcomes-dropdown')) return;

        TahvelJournalEntryDialog.learningOutcomesArray = TahvelJournalEntryDialog.getLearningOutcomesArray();
        if (!TahvelJournalEntryDialog.learningOutcomesArray.length) return;

        TahvelJournalEntryDialog.cacheElements();
        TahvelJournalEntryDialog.validateElements();
        TahvelJournalEntryDialog.injectLearningOutcomesDropdown();
        TahvelJournalEntryDialog.addEventListeners();
        TahvelJournalEntryDialog.updateLearningOutcomeDropdownVisibility();
    }

    private static cacheElements() {
        TahvelJournalEntryDialog.entryNameInput = TahvelJournalEntryDialog.dialog.querySelector('[ng-model="journalEntry.nameEt"]') as HTMLInputElement;
        TahvelJournalEntryDialog.independentWorkMdCheckbox = TahvelJournalEntryDialog.dialog.querySelector('md-checkbox[aria-label="Iseseisev õpe"]');
        TahvelJournalEntryDialog.entryContentTextarea = TahvelJournalEntryDialog.dialog.querySelector('textarea[ng-model="journalEntry.content"]') as HTMLTextAreaElement;
        TahvelJournalEntryDialog.entryTypeMdSelect = TahvelJournalEntryDialog.dialog.querySelector('md-select[ng-model="journalEntry.entryType"]') as HTMLElement;
    }

    private static validateElements() {
        if (!TahvelJournalEntryDialog.entryNameInput) throw new Error('Sissekande input not found');
        if (!TahvelJournalEntryDialog.independentWorkMdCheckbox) throw new Error('Independent work checkbox not found');
        if (!TahvelJournalEntryDialog.entryContentTextarea) throw new Error('Journal entry content textarea not found');
        if (!TahvelJournalEntryDialog.entryTypeMdSelect) throw new Error('Learning outcomes dropdown not found');
    }

    private static addEventListeners() {
        TahvelJournalEntryDialog.entryContentTextarea.addEventListener('keyup', TahvelJournalEntryDialog.updateEntryNameOnContentChange);
        TahvelJournalEntryDialog.entryTypeMdSelect.addEventListener('focus', TahvelJournalEntryDialog.updateEntryNameOnEntryTypeChange);
        ['click', 'keypress'].forEach(e => TahvelJournalEntryDialog.independentWorkMdCheckbox.addEventListener(e, () => {
            TahvelJournalEntryDialog.updateLearningOutcomeDropdownVisibility()
            TahvelJournalEntryDialog.updateEntryName()
        }));
    }

    private static updateEntryNameOnContentChange() {
        TahvelJournalEntryDialog.updateEntryName();
    }

    private static updateEntryNameOnEntryTypeChange() {
        TahvelJournalEntryDialog.updateEntryName();
    }

    private static injectLearningOutcomesDropdown() {
        TahvelJournalEntryDialog.addLearningOutcomesSelectElementToDOM();
        const selectElement = TahvelJournalEntryDialog.getLearningOutcomesSelectElement();
        TahvelJournalEntryDialog.initializeLearningOutcomesDropdownSlimSelect(selectElement);
        TahvelJournalEntryDialog.setLearningOutcomesDropdownSelection();
    }

    private static addLearningOutcomesSelectElementToDOM() {
        TahvelJournalEntryDialog.entryContentTextarea.closest('md-input-container')!.closest('div')!.after(AssistentDom.createStructure(`
            <div layout="row" layout-sm="column" layout-xs="column" class="layout-xs-column layout-sm-column layout-row">
                <md-input-container id="assistent-learning-outcomes-dropdown" style="display: none">
                    <select id="assistent-journal-entry-dialog-learning-outcomes-select-element" multiple>
                        ${TahvelJournalEntryDialog.learningOutcomesArray.map(outcome => `<option value="${outcome.code}">${outcome.name}</option>`).join('')}
                    </select>
                    <div id="slim-select-content-container"></div>
                </md-input-container>
            </div>
        `));
        TahvelJournalEntryDialog.learningOutcomesDropdownContainer = TahvelJournalEntryDialog.dialog.querySelector('#assistent-learning-outcomes-dropdown') as HTMLElement;

    }

    private static getLearningOutcomesSelectElement(): HTMLSelectElement {
        const selectElement = TahvelJournalEntryDialog.dialog.querySelector('#assistent-journal-entry-dialog-learning-outcomes-select-element') as HTMLSelectElement;
        if (!selectElement) throw new Error('Learning outcomes select element not found');
        return selectElement;
    }

    private static initializeLearningOutcomesDropdownSlimSelect(selectElement: HTMLSelectElement) {
        TahvelJournalEntryDialog.learningOutcomesSlimSelect = new SlimSelect({
            select: selectElement,
            settings: {
                contentLocation: document.getElementById('slim-select-content-container'),
                contentPosition: 'relative',
                hideSelected: true,
                showSearch: false,
                placeholderText: 'Vali ÕV-d, millega see iseseisev töö seotud on (vajalik lõpuhinnete arvutamiseks)',
                allowDeselect: true,
            },
            events: {
                afterChange: () => TahvelJournalEntryDialog.updateEntryName()
            }
        });
    }

    private static setLearningOutcomesDropdownSelection() {
        const [, outcomesString] = TahvelJournalEntryDialog.entryNameInput.value.split('(');
        if (outcomesString) {
            const outcomesArray = outcomesString.replace(')', '').split(',').map(s => s.trim());
            if (outcomesArray.length > 0) {
                TahvelJournalEntryDialog.learningOutcomesSlimSelect.setSelected(outcomesArray);
            }
        }
    }



    private static getLearningOutcomesArray(): AssistentLearningOutcomes[] {
        const learningOutcomes = Array.from(document.querySelectorAll('div[ng-if="journal.includesOutcomes"] tbody tr')).map(tr => ({
            name: tr.querySelector('td:nth-child(4)')!.textContent!,
            code: tr.querySelector('td:nth-child(3)')!.textContent!,
            curriculumModuleOutcomes: 0,
            entryType: "",
        }));
        if (learningOutcomes.length === 0) return learningOutcomes;
        TahvelJournalEntryDialog.removeGroupNameIfAllOutcomesAreForTheSameGroup(learningOutcomes);
        return learningOutcomes;
    }

    private static removeGroupNameIfAllOutcomesAreForTheSameGroup(outcomes: AssistentLearningOutcomes[]) {

        const getGroupName = (name: string) => (name.match(/\(([^)]+)\)/g) || []).slice(-1)[0]?.slice(1, -1) || '';
        const firstGroupName = getGroupName(outcomes[0].name);
        if (outcomes.every(({name}) => getGroupName(name) === firstGroupName)) {
            outcomes.forEach(outcome => outcome.name = outcome.name.replace(/\s*\([^)]*\)\s*$/, '').trim());
        }
    }

    private static independentWorkCheckboxIsChecked(): boolean {
        return TahvelJournalEntryDialog.independentWorkMdCheckbox.getAttribute('aria-checked') === 'true';
    }

    private static updateLearningOutcomeDropdownVisibility() {
        TahvelJournalEntryDialog.learningOutcomesDropdownContainer.style.display = TahvelJournalEntryDialog.independentWorkCheckboxIsChecked() ? 'block' : 'none';

    }
}


export default TahvelJournalEntryDialog;
