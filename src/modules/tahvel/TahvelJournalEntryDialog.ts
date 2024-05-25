import SlimSelect from 'slim-select';
import 'slim-select/dist/slimselect.css';
import AssistentDom from "~src/shared/AssistentDom";
import TahvelDom from "~src/modules/tahvel/TahvelDom";
import type {AssistentLearningOutcomes} from "~src/shared/AssistentTypes";


class TahvelJournalEntryDialog {
    static async addLearningOutcomesDropdown() {
        let dialogContainer = null;

        new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    const addedNode = mutation.addedNodes[0] as HTMLElement;
                    if (addedNode.tagName === 'DIV' && addedNode.classList.contains('md-dialog-container')) {

                        dialogContainer = addedNode;

                        // Set up an interval to poll the dialog container for the presence of specific elements
                        const i = setInterval(async () => {

                            // Check if the dialog container's innerHTML contains 4 specific substrings:
                            if (dialogContainer.innerHTML.includes('Sissekande liik')
                                && dialogContainer.innerHTML.includes('Auditoorne õpe')
                                && dialogContainer.innerHTML.includes('Iseseisev õpe')
                                && dialogContainer.innerHTML.includes('Kodutöö')
                            ) {

                                // Clear interval to stop further polling
                                clearInterval(i);

                                const journalEntryDialog = dialogContainer.querySelector('md-dialog') as HTMLElement;

                                // Check first that the learning outcomes dropdown doesn't already exist
                                if (journalEntryDialog.querySelector('#assistent-learning-outcomes-dropdown')) return;

                                // Get the learning outcomes from DOM
                                const learningOutcomes = Array.from(document.querySelectorAll('div[ng-if="journal.includesOutcomes"] tbody tr')).map(tr => ({
                                    name: tr.querySelector('td:nth-child(4)').textContent,
                                    code: tr.querySelector('td:nth-child(3)').textContent,
                                }));

                                if (!learningOutcomes.length) return;

                                this.removeGroupNameIfAllOutcomesAreForTheSameGroup(learningOutcomes);

                                // Wait until the form has completed loading by waiting for the close button to have a focus
                                await AssistentDom.waitForElement('button.md-focused');

                                // Inject the learning outcomes dropdown after Sisu textarea
                                journalEntryDialog.querySelector('textarea[ng-model="journalEntry.content"]').closest('md-input-container').closest('div').after(AssistentDom.createStructure(`
                                    <div layout="row" layout-sm="column" layout-xs="column" class="layout-xs-column layout-sm-column layout-row">
                                        <md-input-container id="assistent-learning-outcomes-dropdown">
                                            <select id="assistent-journal-entry-dialog-learning-outcomes-select-element" multiple>
                                                ${learningOutcomes.map(outcome => `<option value="${outcome.code}">${outcome.name}</option>`).join('')}
                                            </select>
                                            <div id="slim-select-content-container"></div>
                                        </md-input-container>
                                    </div>
                                `));

                                // Initialize SlimSelect
                                const learningOutcomesSelectElement = journalEntryDialog.querySelector('#assistent-journal-entry-dialog-learning-outcomes-select-element');
                                if (!learningOutcomesSelectElement) throw new Error('Learning outcomes select element not found');
                                const learningOutcomesSlimSelect = new SlimSelect({
                                    select: learningOutcomesSelectElement,
                                    settings: {
                                        contentLocation: document.getElementById('#slim-select-content-container'),
                                        hideSelected: true,
                                        showSearch: false,
                                        placeholderText: 'Vali ÕV-d, millega see iseseisev töö seotud on (vajalik lõpuhinnete arvutamiseks)',
                                        allowDeselect: true

                                    }, events: {
                                        afterChange: newVal => {
                                            console.log('New value:', newVal);
                                            console.log('Selected values:', learningOutcomesSlimSelect.getSelected());
                                            this.fillEntryName(learningOutcomesSlimSelect, learningOutcomes);
                                        }
                                    }
                                });

                                const sissekandeNimetusInput = journalEntryDialog.querySelector('[ng-model="journalEntry.nameEt"]') as HTMLInputElement;
                                if (!sissekandeNimetusInput) throw new Error('Sissekande input not found');

                                // Split sissekandeNimetus by '(' to separate the content and learning outcomes
                                const [content, learningOutcomesString] = sissekandeNimetusInput.value.split('(');

                                console.log('content:', content);

                                // Remove the closing parenthesis from learningOutcomesString and split by ',' to get an array of learning outcomes
                                const learningOutcomesArray = learningOutcomesString.replace(')', '').split(',').map(s => s.trim());

                                // Validate if learningOutcomesArray is not empty
                                if (learningOutcomesArray.length > 0) {
                                    // Set selected values to learningOutcomesSlimSelect
                                    learningOutcomesSlimSelect.setSelected(learningOutcomesArray);
                                }


                                const independentWorkCheckbox = journalEntryDialog.querySelector('md-checkbox[aria-label="Iseseisev õpe"]');
                                if (!independentWorkCheckbox) throw new Error('Independent work checkbox not found');

                                const learningOutcomesDropdown = journalEntryDialog.querySelector('#assistent-learning-outcomes-dropdown') as HTMLElement;
                                if (!learningOutcomesDropdown) throw new Error('Learning outcomes dropdown not found');

                                const entryTypeElement = journalEntryDialog.querySelector('md-select[ng-model="journalEntry.entryType"]') as HTMLElement;
                                if (!entryTypeElement) throw new Error('Learning outcomes dropdown not found');

                                function independentWorkCheckboxIsChecked() {
                                    return independentWorkCheckbox.getAttribute('aria-checked') === 'true';
                                }

                                // add event listener to entryTypeElement to overwrite the entry name with the selected learning outcomes
                                entryTypeElement.addEventListener('focus', () => {

                                    if (independentWorkCheckboxIsChecked()) {
                                        this.fillEntryName(learningOutcomesSlimSelect, learningOutcomes);
                                    }
                                });

                                const toggleDropdownDisplay = () => {
                                    learningOutcomesDropdown.style.display = independentWorkCheckboxIsChecked() ? 'block' : 'none';
                                };
                                toggleDropdownDisplay();
                                independentWorkCheckbox.addEventListener('click', toggleDropdownDisplay);


                            }

                        }, 300);

                        setTimeout(() => clearInterval(i), 5000);
                    }
                }
            });

        }).observe(document.body, {childList: true, subtree: true});
    }

    private static removeGroupNameIfAllOutcomesAreForTheSameGroup = outcomes => {
        const getGroupName = name => (name.match(/\(([^)]+)\)/g) || []).slice(-1)[0]?.slice(1, -1) || '';
        const firstGroupName = getGroupName(outcomes[0].name);
        if (outcomes.every(({name}) => getGroupName(name) === firstGroupName)) {
            outcomes.forEach(outcome => outcome.name = outcome.name.replace(/\s*\([^)]*\)\s*$/, '').trim());
        }
    };

    static async fillEntryName(learningOutcomesSlimSelect, learningOutcomes: AssistentLearningOutcomes[]) {
        const contentElement = document.querySelector('textarea[ng-model="journalEntry.content"]') as HTMLTextAreaElement;
        const content = contentElement.value;
        const truncatedContent = content.slice(0, 30);
        const ellipsis = content.length > 30 ? '...' : '';
        const outcomes = learningOutcomesSlimSelect.getSelected()
            .map(code => learningOutcomes.find(o => o.code === code)?.code)
            .join(', ');
        const entryName = `${truncatedContent}${ellipsis} (${outcomes})`;
        TahvelDom.fillTextbox('input[ng-model="journalEntry.nameEt"]', entryName);
    }

}

export default TahvelJournalEntryDialog;
