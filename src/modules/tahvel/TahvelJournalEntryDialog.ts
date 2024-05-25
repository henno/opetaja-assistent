import SlimSelect from 'slim-select';
import 'slim-select/dist/slimselect.css';
import AssistentDom from "~src/shared/AssistentDom";
import TahvelDom from "~src/modules/tahvel/TahvelDom";


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
                        const i = setInterval(() => {

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
                                if (learningOutcomesSelectElement) {
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

                                                TahvelDom.fillTextbox(
                                                    'input[ng-model="journalEntry.nameEt"]',
                                                    learningOutcomesSlimSelect.getSelected()
                                                        .map(code => learningOutcomes.find(o => o.code === code)?.code)
                                                        .join(', '));
                                            }
                                        }
                                    });
                                    const sissekandeNimetusInput = journalEntryDialog.querySelector('[ng-model="journalEntry.nameEt"]') as HTMLInputElement;
                                    if(!sissekandeNimetusInput) throw new Error('Sissekande input not found');
                                    // Set default values from sissekandeNimetus to learningOutcomesSlimSelect
                                    const sissekandeNimetus = sissekandeNimetusInput.value;
                                    // convert comma separated values to json array
                                    const sissekandeNimetusArray = sissekandeNimetus.split(',').map(s => s.trim());
                                    // vallidate if sissekandeNimetusArray is not empty
                                    if (sissekandeNimetusArray.length > 0) {
                                        // set selected values to learningOutcomesSlimSelect
                                        learningOutcomesSlimSelect.setSelected(sissekandeNimetusArray);
                                    }

                                }

                                const independentWorkCheckbox = journalEntryDialog.querySelector('md-checkbox[aria-label="Iseseisev õpe"]');
                                if (!independentWorkCheckbox) throw new Error('Independent work checkbox not found');

                                const learningOutcomesDropdown = journalEntryDialog.querySelector('#assistent-learning-outcomes-dropdown') as HTMLElement;
                                if (!learningOutcomesDropdown) throw new Error('Learning outcomes dropdown not found');

                                const toggleDropdownDisplay = () => {
                                    learningOutcomesDropdown.style.display = independentWorkCheckbox.getAttribute('aria-checked') === 'true' ? 'block' : 'none';
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
}

export default TahvelJournalEntryDialog;
