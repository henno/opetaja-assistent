import SlimSelect from 'slim-select';
import 'slim-select/dist/slimselect.css';
import AssistentDom from "~src/shared/AssistentDom";
import TahvelDom from "~src/modules/tahvel/TahvelDom";
import type {AssistentLearningOutcomes} from "~src/shared/AssistentTypes";


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
        let dialogContainer = null;

        // Set up a MutationObserver to watch for the appearance of the dialog
        new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    const addedNode = mutation.addedNodes[0] as HTMLElement;
                    if (addedNode.tagName === 'DIV' && addedNode.classList.contains('md-dialog-container')) {

                        dialogContainer = addedNode;

                        // Ensure the dialog is fully loaded by polling for the presence of specific elements
                        const i = setInterval(async () => {

                            // Check if the dialog container's innerHTML contains 4 specific substrings:
                            if (dialogContainer.innerHTML.includes('Sissekande liik')
                                && dialogContainer.innerHTML.includes('Auditoorne õpe')
                                && dialogContainer.innerHTML.includes('Iseseisev õpe')
                                && dialogContainer.innerHTML.includes('Kodutöö')
                            ) {

                                // Clear interval to stop further polling
                                clearInterval(i);

                                // Wait until the form has completed loading by waiting for the close button to have a focus
                                await AssistentDom.waitForElement('button.md-focused');

                                // Save reference to the dialog element
                                this.dialog = dialogContainer.querySelector('md-dialog') as HTMLElement;

                                // Abort if the dialog is already customized (sometimes the MutationObserver fires multiple times)
                                if (this.dialog.querySelector('#assistent-learning-outcomes-dropdown')) return;

                                // Get the learning outcomes from DOM
                                this.learningOutcomesArray = TahvelJournalEntryDialog.getLearningOutcomesArray();

                                // Abort if there are no learning outcomes in this journal
                                if (!this.learningOutcomesArray.length) return;

                                // Save references to the dialog's input elements
                                this.entryNameInput = this.dialog.querySelector('[ng-model="journalEntry.nameEt"]') as HTMLInputElement;
                                this.independentWorkMdCheckbox = this.dialog.querySelector('md-checkbox[aria-label="Iseseisev õpe"]');
                                this.entryContentTextarea = this.dialog.querySelector('textarea[ng-model="journalEntry.content"]') as HTMLTextAreaElement;
                                this.entryTypeMdSelect = this.dialog.querySelector('md-select[ng-model="journalEntry.entryType"]') as HTMLElement;

                                // Validate that the required elements are present
                                if (!this.entryNameInput) throw new Error('Sissekande input not found');
                                if (!this.independentWorkMdCheckbox) throw new Error('Independent work checkbox not found');
                                if (!this.entryContentTextarea) throw new Error('Journal entry content textarea not found');

                                // Inject the learning outcomes dropdown after Sisu textarea
                                TahvelJournalEntryDialog.injectLearningOutcomesDropdown();


                                // Save reference to the learning outcomes dropdown container (after it has been injected)
                                this.learningOutcomesDropdownContainer = this.dialog.querySelector('#assistent-learning-outcomes-dropdown')
                                if (!this.entryTypeMdSelect) throw new Error('Learning outcomes dropdown not found');

                                // Set up event listeners
                                TahvelJournalEntryDialog.updateEntryNameOnEntryTypeChange();
                                TahvelJournalEntryDialog.updateEntryNameOnContentChange();
                                TahvelJournalEntryDialog.updateLearningOutcomesDropdownVisibilityOnIndependentWorkCheckboxClick();

                                // Set the visibility of the learning outcomes dropdown when the dialog is opened
                                this.updateLearningOutcomeDropdownVisibility();
                            }

                        }, 300);

                        setTimeout(() => clearInterval(i), 5000);
                    }
                }
            });

        }).observe(document.body, {childList: true, subtree: true});
    }

    static async updateEntryName() {

        const content = this.entryContentTextarea.value
            .replace(/\n/g, ' ')  // Replace newlines with spaces
            .replace(/\s+/g, ' ') // Remove extra spaces
            .trim();                                     // Trim the content


        console.log('Content:', content)

        const truncatedContent = content.slice(0, 30);
        const ellipsis = content.length > 30 ? '...' : '';
        const outcomes = this.learningOutcomesSlimSelect.getSelected()
            .map(code => this.learningOutcomesArray.find(o => o.code === code)?.code)
            .join(', ');
        const entryName = `${truncatedContent}${ellipsis}${outcomes ? ` (${outcomes})` : ''}`;
        TahvelDom.fillTextbox('input[ng-model="journalEntry.nameEt"]', entryName);
    }

    private static updateEntryNameOnContentChange() {
        // add event listener to entryTypeElement to overwrite the entry name with the selected learning outcomes
        this.entryContentTextarea.addEventListener('keyup', () => {
            console.log('Content changed')
            if (this.independentWorkCheckboxIsChecked()) {
                this.updateEntryName();
            }
        });
    }

    private static updateEntryNameOnEntryTypeChange() {
        this.entryTypeMdSelect.addEventListener('focus', () => {

            if (this.independentWorkCheckboxIsChecked()) {
                this.updateEntryName();
            }
        });
    }

    private static injectLearningOutcomesDropdown() {
        this.addLearningOutcomesSelectElementToDOM();
        this.initializeLearningOutcomesDropdownSlimSelect(this.getLearningOutcomesSelectElement());
        this.setLearningOutcomesDropdownSelection();
    }

    private static addLearningOutcomesSelectElementToDOM() {
        this.entryContentTextarea.closest('md-input-container').closest('div').after(AssistentDom.createStructure(`
            <div layout="row" layout-sm="column" layout-xs="column" class="layout-xs-column layout-sm-column layout-row">
                <md-input-container id="assistent-learning-outcomes-dropdown" style="display: none">
                    <select id="assistent-journal-entry-dialog-learning-outcomes-select-element" multiple>
                        ${this.learningOutcomesArray.map(outcome => `<option value="${outcome.code}">${outcome.name}</option>`).join('')}
                    </select>
                    <div id="slim-select-content-container"></div>
                </md-input-container>
            </div>
        `));
    }

    private static getLearningOutcomesSelectElement(): HTMLSelectElement {
        const selectElement = this.dialog.querySelector('#assistent-journal-entry-dialog-learning-outcomes-select-element') as HTMLSelectElement;
        if (!selectElement) throw new Error('Learning outcomes select element not found');
        return selectElement;
    }

    private static initializeLearningOutcomesDropdownSlimSelect(selectElement: HTMLSelectElement) {
        this.learningOutcomesSlimSelect = new SlimSelect({
            select: selectElement,
            settings: {
                contentLocation: document.getElementById('#slim-select-content-container'),
                hideSelected: true,
                showSearch: false,
                placeholderText: 'Vali ÕV-d, millega see iseseisev töö seotud on (vajalik lõpuhinnete arvutamiseks)',
                allowDeselect: true
            },
            events: {
                afterChange: newVal => {
                    console.log('New value:', newVal);
                    console.log('Selected values:', this.learningOutcomesSlimSelect.getSelected());
                    this.updateEntryName();
                }
            }
        });
    }

    private static setLearningOutcomesDropdownSelection() {
        const [content, outcomesString] = this.entryNameInput.value.split('(');
        console.log('content:', content);

        if (outcomesString) {
            const outcomesArray = outcomesString.replace(')', '').split(',').map(s => s.trim());
            if (outcomesArray.length > 0) {
                this.learningOutcomesSlimSelect.setSelected(outcomesArray);
            }
        }
    }

    private static getLearningOutcomesArray() {
        const learningOutcomes = Array.from(document.querySelectorAll('div[ng-if="journal.includesOutcomes"] tbody tr')).map(tr => ({
            name: tr.querySelector('td:nth-child(4)').textContent,
            code: tr.querySelector('td:nth-child(3)').textContent,
        }));
        this.removeGroupNameIfAllOutcomesAreForTheSameGroup(learningOutcomes);
        return learningOutcomes;
    }

    private static removeGroupNameIfAllOutcomesAreForTheSameGroup = outcomes => {
        const getGroupName = name => (name.match(/\(([^)]+)\)/g) || []).slice(-1)[0]?.slice(1, -1) || '';
        const firstGroupName = getGroupName(outcomes[0].name);
        if (outcomes.every(({name}) => getGroupName(name) === firstGroupName)) {
            outcomes.forEach(outcome => outcome.name = outcome.name.replace(/\s*\([^)]*\)\s*$/, '').trim());
        }
    }

    private static independentWorkCheckboxIsChecked() {
        return this.independentWorkMdCheckbox.getAttribute('aria-checked') === 'true';
    }

    private static updateLearningOutcomeDropdownVisibility() {
        this.learningOutcomesDropdownContainer.style.display = this.independentWorkCheckboxIsChecked() ? 'block' : 'none';
    }

    private static updateLearningOutcomesDropdownVisibilityOnIndependentWorkCheckboxClick() {
        this.independentWorkMdCheckbox.addEventListener('click', this.updateLearningOutcomeDropdownVisibility.bind(this));
    }


}

export default TahvelJournalEntryDialog;
