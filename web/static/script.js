document.addEventListener('DOMContentLoaded', function() {
    // Initialize IndexedDB
    initIndexedDB();

    // Add event on buttons to toggle notes' rows
    document.getElementById('checklistForm').addEventListener('click', function(e) {
        if (e.target.classList.contains('notesBtn')) {
            const key = e.target.dataset.notesFor;
            const row = document.getElementById('notesRow-' + key);
            row.classList.toggle('hiddenRow');
        }
    });

    // Save notes on input
    document.getElementById('checklistForm').addEventListener('input', function(e) {
        if (e.target.classList.contains('notesArea')) {
            saveToIndexedDB();
        }
    });

    // Radio change: highlight, update progress, save
    document.getElementById('checklistForm').addEventListener('change', function(e) {
        highlightRows(e);
        updateProgressBar();
        saveToIndexedDB();
    });

    // Initial restore on load
    restoreFromIndexedDB();
    highlightRows();
    updateProgressBar();
});

// IndexedDB setup
let db;

function initIndexedDB() {
    const request = indexedDB.open('ChecklistDB', 2); // Increment version

    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.error);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        restoreFromIndexedDB();
        restoreProjectData();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;

        // Create object store for checklist data
        if (!db.objectStoreNames.contains('checklist')) {
            db.createObjectStore('checklist', { keyPath: 'id' });
        }

        // Create object store for notes
        if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' });
        }

        // Create object store for maturity sliders
        if (!db.objectStoreNames.contains('maturity')) {
            db.createObjectStore('maturity', { keyPath: 'id' });
        }

        // Create object store for project information
        if (!db.objectStoreNames.contains('project')) {
            db.createObjectStore('project', { keyPath: 'id' });
        }
    };
}

function updateProgressBar() {
    const radios = document.querySelectorAll('.rIn');
    const checked = document.querySelectorAll('.rIn:checked');
    const percent = radios.length ? (checked.length / radios.length) * 100 : 0;
    document.getElementById('progressBar').style.width = percent + '%';

    // Update both matrices
    updateMaturityProgress();
    updatePriorityMatrix();
}

function highlightRows(e) {
    if (e && e.target) {
        let r = e.target;
        let tr = r.closest('tr');
        if (!tr) return;
        tr.classList.remove('tr-yes', 'tr-no', 'tr-na');
        if (r.value === 'yes') tr.classList.add('tr-yes');
        else if (r.value === 'no') tr.classList.add('tr-no');
        else if (r.value === 'na') tr.classList.add('tr-na');
    } else {
        document.querySelectorAll('table tr').forEach(tr => {
            if (tr.querySelector('th')) return;
            tr.classList.remove('tr-yes', 'tr-no', 'tr-na');
            const checked = tr.querySelector('input[type=radio]:checked');
            if (checked) {
                if (checked.value === 'yes') tr.classList.add('tr-yes');
                else if (checked.value === 'no') tr.classList.add('tr-no');
                else if (checked.value === 'na') tr.classList.add('tr-na');
            }
        });
    }
}

function saveToIndexedDB() {
    if (!db) return;

    const transaction = db.transaction(['checklist', 'notes'], 'readwrite');
    const checklistStore = transaction.objectStore('checklist');
    const notesStore = transaction.objectStore('notes');

    // Save radio button selections
    const radios = document.querySelectorAll('.rIn');
    let checklistData = { id: 'current', data: {} };
    radios.forEach(r => {
        if (r.checked) checklistData.data[r.name] = r.value;
    });
    checklistStore.put(checklistData);

    // Save notes
    const notesData = { id: 'current', data: {} };
    document.querySelectorAll('.notesArea').forEach(area => {
        if (area.value.trim()) notesData.data[area.dataset.notesFor] = area.value;
    });
    notesStore.put(notesData);
}

function restoreFromIndexedDB() {
    if (!db) return;

    const transaction = db.transaction(['checklist', 'notes'], 'readonly');
    const checklistStore = transaction.objectStore('checklist');
    const notesStore = transaction.objectStore('notes');

    // Restore checklist data
    const checklistRequest = checklistStore.get('current');
    checklistRequest.onsuccess = function(event) {
        const result = event.target.result;
        if (result && result.data) {
            for (let key in result.data) {
                if (result.data[key]) {
                    let radios = document.getElementsByName(key);
                    for (let r of radios) {
                        if (r.value === result.data[key]) r.checked = true;
                    }
                }
            }
            highlightRows();
            updateProgressBar();
        }
    };

    // Restore notes
    const notesRequest = notesStore.get('current');
    notesRequest.onsuccess = function(event) {
        const result = event.target.result;
        if (result && result.data) {
            for (let key in result.data) {
                let area = document.querySelector('.notesArea[data-notes-for="' + key + '"]');
                let row = document.getElementById('notesRow-' + key);
                if (area && row && result.data[key].trim()) {
                    area.value = result.data[key];
                    row.classList.remove('hiddenRow');
                }
            }
        }
    };
}

function resetChecklist() {
    if (!db) return;

    // Clear IndexedDB data
    const transaction = db.transaction(['checklist', 'notes'], 'readwrite');
    const checklistStore = transaction.objectStore('checklist');
    const notesStore = transaction.objectStore('notes');

    checklistStore.delete('current');
    notesStore.delete('current');

    // Uncheck all radios
    document.querySelectorAll('.rIn').forEach(r => r.checked = false);
    // Clear all notes and collapse
    document.querySelectorAll('.notesArea').forEach(area => area.value = '');
    collapseAllNotes();
    highlightRows();
    updateProgressBar();
}

function collapseAllNotes() {
    document.querySelectorAll('.notesRow').forEach(row => row.classList.add('hiddenRow'));
}

function toggleDisclaimer() {
    const disclaimerCard = document.querySelector('.disclaimer-card');
    disclaimerCard.classList.toggle('collapsed');
}

function scrollToMatrix() {
    const matrixSection = document.querySelector('.maturity-matrix-section');
    if (matrixSection) {
        const offset = 80; // Adjust this value based on your sticky nav height
        const elementPosition = matrixSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Test Maturity Matrix functionality
function updateMaturityProgress() {
    // Get all matrix rows and update their progress
    document.querySelectorAll('.matrix-row').forEach(row => {
        const categoryKey = row.dataset.category;

        // Update progress for each level (controlled, efficient, optimized)
        ['controlled', 'efficient', 'optimized'].forEach(level => {
            const progressElement = row.querySelector(
                `.level-progress[data-level="${level}"]`
            );

            if (progressElement) {
                const progress = calculateCategoryLevelProgress(categoryKey, level);
                updateMaturityProgressBar(progressElement, progress);
            }
        });
    });
}

function calculateCategoryLevelProgress(categoryKey, level) {
    // Convert category key to match form naming pattern
    const categoryName = categoryKey.replace(/-/g, ' ');

    // Find category index in form structure
    let categoryIndex = 0;
    const formCategories = Array.from(document.querySelectorAll('#checklistForm h2'));

    for (let i = 0; i < formCategories.length; i++) {
        const formCategoryName = formCategories[i].textContent.toLowerCase();
        if (formCategoryName.includes(categoryName.toLowerCase())) {
            categoryIndex = i + 1;
            break;
        }
    }

    if (categoryIndex === 0) {
        return { yesCount: 0, noCount: 0, totalRelevant: 0 };
    }

    // Create pattern to match form question names: e.g., "01.c.1", "01.c.2" etc.
    const categoryPrefix = String(categoryIndex).padStart(2, '0');
    const levelPrefix = level.charAt(0).toLowerCase();
    const questionPattern = new RegExp(`^${categoryPrefix}\\.${levelPrefix}\\.\\d+$`);

    let yesCount = 0;
    let noCount = 0;
    let totalRelevant = 0;

    // Group radios by question name
    const questionGroups = {};
    document.querySelectorAll('.rIn').forEach(radio => {
        if (questionPattern.test(radio.name)) {
            if (!questionGroups[radio.name]) {
                questionGroups[radio.name] = [];
            }
            questionGroups[radio.name].push(radio);
        }
    });

    // Count answers for each question
    Object.values(questionGroups).forEach(group => {
        const checkedRadio = group.find(r => r.checked);
        if (checkedRadio) {
            if (checkedRadio.value === 'yes') {
                yesCount++;
                totalRelevant++;
            } else if (checkedRadio.value === 'no') {
                noCount++;
                totalRelevant++;
            }
            // N/A answers are excluded from progress calculation
        }
    });

    return { yesCount, noCount, totalRelevant };
}

function updateMaturityProgressBar(progressElement, progress) {
    const { yesCount, noCount, totalRelevant } = progress;
    const yesSegment = progressElement.querySelector('.yes-progress');
    const noSegment = progressElement.querySelector('.no-progress');
    const progressText = progressElement.querySelector('.progress-text');

    if (totalRelevant === 0) {
        yesSegment.style.width = '0%';
        noSegment.style.width = '0%';
        progressText.textContent = '0%';
        // Add neutral/gray background for unanswered questions
        progressElement.style.backgroundColor = '#e0e0e0';
        return;
    }

    // Reset background color when there are answers
    progressElement.style.backgroundColor = '';

    const yesPercentage = (yesCount / totalRelevant) * 100;
    const noPercentage = (noCount / totalRelevant) * 100;

    yesSegment.style.width = `${yesPercentage}%`;
    noSegment.style.width = `${noPercentage}%`;

    // Show percentage of positive answers
    progressText.textContent = `${Math.round(yesPercentage)}%`;
}

// Initialize maturity matrix
document.addEventListener('DOMContentLoaded', function() {
    // Add maturity slider event listeners
    document.querySelectorAll('.maturity-slider').forEach(slider => {
        slider.addEventListener('input', function() {
            saveToIndexedDB();
        });
    });

    // Initial maturity progress update
    setTimeout(() => {
        updateMaturityProgress();
        updatePriorityMatrix();
    }, 100); // Small delay to ensure all elements are loaded
});

// Management Priority Matrix functionality
function updatePriorityMatrix() {
    // Update each priority level (high, neutral, low)
    ['high', 'neutral', 'low'].forEach(priorityLevel => {
        // Update each maturity level (controlled, efficient, optimized)
        ['controlled', 'efficient', 'optimized'].forEach((maturityLevel, columnIndex) => {
            const progress = calculatePriorityProgress(priorityLevel, maturityLevel);
            updatePriorityProgressBar(priorityLevel, columnIndex, progress);
        });
    });
}

function calculatePriorityProgress(priorityLevel, maturityLevel) {
    // Map priority levels to slider values
    const priorityValues = {
        'high': 3,    // H
        'neutral': 2, // N
        'low': 1      // L
    };

    const targetPriorityValue = priorityValues[priorityLevel];

    let yesCount = 0;
    let noCount = 0;
    let totalRelevant = 0;

    // Get all matrix rows with sliders
    document.querySelectorAll('.matrix-row').forEach(row => {
        const slider = row.querySelector('.maturity-slider');
        const sliderValue = parseInt(slider.value);

        // Only include categories that match the priority level
        if (sliderValue === targetPriorityValue) {
            const categoryKey = row.dataset.category;

            // Calculate progress for this category and maturity level
            const progress = calculateCategoryLevelProgress(categoryKey, maturityLevel);

            yesCount += progress.yesCount;
            noCount += progress.noCount;
            totalRelevant += progress.totalRelevant;
        }
    });

    return { yesCount, noCount, totalRelevant };
}

function updatePriorityProgressBar(priorityLevel, columnIndex, progress) {
    const { yesCount, noCount, totalRelevant } = progress;
    const priorityRow = document.querySelector(`[data-priority="${priorityLevel}"]`);
    const progressCell = priorityRow.querySelectorAll('.priority-progress-cell')[columnIndex];

    const yesSegment = progressCell.querySelector('.priority-yes');
    const noSegment = progressCell.querySelector('.priority-no');
    const percentageText = progressCell.querySelector('.priority-percentage');

    if (totalRelevant === 0) {
        yesSegment.style.width = '0%';
        noSegment.style.width = '0%';
        percentageText.textContent = '0%';
        return;
    }

    const yesPercentage = (yesCount / totalRelevant) * 100;
    const noPercentage = (noCount / totalRelevant) * 100;

    yesSegment.style.width = `${yesPercentage}%`;
    noSegment.style.width = `${noPercentage}%`;

    // Show percentage of positive answers
    percentageText.textContent = `${Math.round(yesPercentage)}%`;
}

// Add event listeners for maturity sliders to update priority matrix
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for maturity sliders
    document.querySelectorAll('.maturity-slider').forEach(slider => {
        slider.addEventListener('input', function() {
            saveToIndexedDB();
            updatePriorityMatrix(); // Update priority matrix when slider changes
        });
    });

    // Add event listeners for priority checkboxes filtering functionality
    document.querySelectorAll('.priority-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            toggleColumnVisibility();
            updatePriorityMatrix();
        });
    });
});

// Column filtering functionality
function toggleColumnVisibility() {
    const checkboxes = document.querySelectorAll('.priority-checkboxes input[type="checkbox"]');

    checkboxes.forEach((checkbox, index) => {
        const columnClass = ['controlled-column', 'efficient-column', 'optimizing-column'][index];
        const columns = document.querySelectorAll(`.${columnClass}`);

        if (checkbox.checked) {
            // Show column
            columns.forEach(col => col.classList.remove('hidden'));
        } else {
            // Hide column
            columns.forEach(col => col.classList.add('hidden'));
        }
    });
}

// Project Information functionality
function initializeProjectForm() {
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('auditDate').value = today;

    // Add event listeners for auto-save
    const projectFields = ['projectName', 'auditors', 'auditDate', 'overview'];
    projectFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', saveProjectData);
            field.addEventListener('change', saveProjectData);
        }
    });

    // Restore saved project data
    restoreProjectData();
}

function saveProjectData() {
    if (!db) return;

    const transaction = db.transaction(['project'], 'readwrite');
    const projectStore = transaction.objectStore('project');

    const projectData = {
        id: 'current',
        projectName: document.getElementById('projectName').value,
        auditors: document.getElementById('auditors').value,
        auditDate: document.getElementById('auditDate').value,
        overview: document.getElementById('overview').value
    };

    projectStore.put(projectData);
}

function restoreProjectData() {
    if (!db) return;

    const transaction = db.transaction(['project'], 'readonly');
    const projectStore = transaction.objectStore('project');

    const request = projectStore.get('current');
    request.onsuccess = function(event) {
        const result = event.target.result;
        if (result) {
            document.getElementById('projectName').value = result.projectName || '';
            document.getElementById('auditors').value = result.auditors || '';
            document.getElementById('auditDate').value = result.auditDate || new Date().toISOString().split('T')[0];
            document.getElementById('overview').value = result.overview || '';
        }
    };
}

// Export functions
function exportToCSV() {
    const projectName = document.getElementById('projectName').value || 'Unnamed Project';

    // Prepare CSV data
    const csvData = [];
    csvData.push(['ID', 'Name', 'Answer', 'Note']); // Header

    // Get all questions from the form
    const allQuestions = [];
    document.querySelectorAll('#checklistForm table').forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const radio = row.querySelector('.rIn');
            if (radio) {
                const questionId = radio.name;
                const questionText = row.cells[0].textContent.trim();
                const checkedRadio = row.querySelector('.rIn:checked');
                const answer = checkedRadio ? checkedRadio.value : '';

                // Get note for this question
                const noteArea = document.querySelector(`.notesArea[data-notes-for="${questionId}"]`);
                const note = noteArea ? noteArea.value.trim() : '';

                csvData.push([questionId, questionText, answer, note]);
            }
        });
    });

    // Convert to CSV string
    const csvString = csvData.map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`)
           .join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectName}_TPI_NEXT_Checklist.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToPDF() {
    // Check if jsPDF is available
    if (typeof window.jsPDF === 'undefined') {
        loadJsPDFAndExport();
        return;
    }

    generatePDF();
}

function loadJsPDFAndExport() {
    // Load jsPDF and autoTable plugin from CDN
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

    const autoTableScript = document.createElement('script');
    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';

    let scriptsLoaded = 0;
    const onScriptLoad = () => {
        scriptsLoaded++;
        if (scriptsLoaded === 2) {
            generatePDF();
        }
    };

    jsPDFScript.onload = onScriptLoad;
    autoTableScript.onload = onScriptLoad;

    jsPDFScript.onerror = autoTableScript.onerror = function() {
        alert('Failed to load PDF library. Please check your internet connection and try again.');
    };

    document.head.appendChild(jsPDFScript);
    document.head.appendChild(autoTableScript);
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get project information
    const projectName = document.getElementById('projectName').value || 'Unnamed Project';
    const auditors = document.getElementById('auditors').value || 'Unknown Auditors';
    const auditDateValue = document.getElementById('auditDate').value || new Date().toISOString().split('T')[0];

    // Format date from yyyy-mm-dd to dd-mm-yyyy
    const auditDate = auditDateValue.split('-').reverse().join('-');

    const overview = document.getElementById('overview').value || '';

    let yPosition = 20;

    // Helper function to add text with word wrap
    function addWrappedText(text, x, y, maxWidth, fontSize = 12) {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * (fontSize * 0.35) + 5;
    }

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    const titleText = `TPI NEXT evaluation of ${projectName}`;
    const titleWidth = doc.getTextWidth(titleText);
    const pageWidth = doc.internal.pageSize.width;
    doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition); // Center the title
    yPosition += 12;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const subtitleText = `By ${auditors}, created ${auditDate}`;
    const subtitleWidth = doc.getTextWidth(subtitleText);
    doc.text(subtitleText, (pageWidth - subtitleWidth) / 2, yPosition); // Center the subtitle
    yPosition += 15;

    // Overview section
    if (overview) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12); // Зменшено з 14 до 12
        doc.text('Overview:', 20, yPosition);
        yPosition += 6; // Зменшено відступ
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10); // Зменшено з 11 до 10
        const overviewHeight = addWrappedText(overview, 20, yPosition, 170);
        yPosition += overviewHeight + 5;
    }

    // Test Maturity Matrix section
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('Test Maturity Matrix', 20, yPosition);
    yPosition += 10;

    // Prepare matrix table data with progress bars
    const matrixData = [];
    document.querySelectorAll('.matrix-row').forEach(row => {
        const categoryName = row.querySelector('.category-name').textContent;
        const slider = row.querySelector('.maturity-slider');
        const importance = ['Low', 'Normal', 'High'][slider.value - 1];

        // Get progress data for visual bars
        const controlledProgress = parseInt(row.querySelector('[data-level="controlled"] .progress-text').textContent);
        const efficientProgress = parseInt(row.querySelector('[data-level="efficient"] .progress-text').textContent);
        const optimizedProgress = parseInt(row.querySelector('[data-level="optimized"] .progress-text').textContent);

        matrixData.push([
            categoryName,
            importance,
            controlledProgress,
            efficientProgress,
            optimizedProgress
        ]);
    });

    // Add matrix table with custom cell rendering for progress bars
    doc.autoTable({
        startY: yPosition,
        head: [['Key Area', 'Importance', 'Controlled', 'Efficient', 'Optimized']],
        body: matrixData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, minCellHeight: 8 }, // Зменшено висоту та padding
        headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 30, halign: 'center' }
        },
        didDrawCell: function (data) {
            // Draw progress bars for columns 2, 3, 4 (Controlled, Efficient, Optimized)
            if (data.section === 'body' && data.column.index >= 2) {
                const progress = data.cell.raw; // Get the percentage value
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const cellWidth = data.cell.width;
                const cellHeight = data.cell.height;

                // Clear the cell content (remove percentage text)
                doc.setFillColor(255, 255, 255); // White
                doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');

                // Draw progress bar background
                doc.setFillColor(236, 240, 241); // Light gray
                doc.rect(cellX + 2, cellY + 2, cellWidth - 4, cellHeight - 4, 'F');

                // Draw green progress bar fill based on percentage
                if (progress > 0) {
                    const fillWidth = ((cellWidth - 4) * progress) / 100;
                    doc.setFillColor(39, 174, 96); // Green for progress
                    doc.rect(cellX + 2, cellY + 2, fillWidth, cellHeight - 4, 'F');
                }

                // Draw red progress bar for remaining percentage (no answers)
                const remainingPercent = 100 - progress;
                if (remainingPercent > 0) {
                    const greenWidth = ((cellWidth - 4) * progress) / 100;
                    const redWidth = ((cellWidth - 4) * remainingPercent) / 100;
                    doc.setFillColor(231, 76, 60); // Red for no answers
                    doc.rect(cellX + 2 + greenWidth, cellY + 2, redWidth, cellHeight - 4, 'F');
                }

                // Redraw cell border
                doc.setDrawColor(0, 0, 0);
                doc.rect(cellX, cellY, cellWidth, cellHeight);
            }
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Questions with notes section - always start on new page
    doc.addPage();
    yPosition = 20;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('Questions with Notes', 20, yPosition);
    yPosition += 10;

    // Get questions with notes
    const questionsWithNotes = [];
    document.querySelectorAll('#checklistForm table').forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const radio = row.querySelector('.rIn');
            if (radio) {
                const questionId = radio.name;
                const questionText = row.cells[0].textContent.trim();
                const noteArea = document.querySelector(`.notesArea[data-notes-for="${questionId}"]`);
                const note = noteArea ? noteArea.value.trim() : '';

                if (note) {
                    const checkedRadio = row.querySelector('.rIn:checked');
                    const answer = checkedRadio ? checkedRadio.value.toUpperCase() : 'NOT ANSWERED';
                    questionsWithNotes.push([questionId, answer, questionText, note]);
                }
            }
        });
    });

    if (questionsWithNotes.length > 0) {
        // Add questions with notes table
        doc.autoTable({
            startY: yPosition,
            head: [['ID', 'Answer', 'Question', 'Note']],
            body: questionsWithNotes,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 80 },
                3: { cellWidth: 60 }
            }
        });
    } else {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.text('No questions have notes.', 20, yPosition);
    }

    // Save PDF
    doc.save(`${projectName}_TPI_NEXT_Report.pdf`);
}

// Initialize project form when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize project form
    setTimeout(() => {
        initializeProjectForm();
    }, 200); // Small delay to ensure DB is ready
});
