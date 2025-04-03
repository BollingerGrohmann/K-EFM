document.addEventListener('DOMContentLoaded', function () {
    console.log("Page Loaded"); // To confirm when the document is loaded
    const geometryContent = document.getElementById('geometry-content');
    const materialContent = document.getElementById('material-content');
    const loadContent = document.getElementById('load-content');
    const geotechnicContent = document.getElementById('geotechnic-content');

    // Store material data and field names globally
    let materialsData = [];
    let fieldNames = [];

    //////////////////////////////////////////////////////////////////////////
    let elementsList = getElementsFromLocalStorage();
    // Flag for material loading once
    window.materialsLoaded = false;


    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    //  ████████╗ █████╗ ██████╗ ███████╗
    //  ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝
    //     ██║   ███████║██████╔╝███████╗
    //     ██║   ██╔══██║██╔══██╗╚════██║
    //     ██║   ██║  ██║██████╔╝███████║
    //     ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚══════╝                            
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    const tabs = {
        geometry: document.getElementById('geometry-tab'),
        material: document.getElementById('material-tab'),
        load: document.getElementById('load-tab'),
        geotechnic: document.getElementById('geotechnic-tab')
    };

    function setActiveTab(activeTab) {
        Object.values(tabs).forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');
    }

    function hideAllContent() {
        geometryContent.style.display = 'none';
        materialContent.style.display = 'none';
        loadContent.style.display = 'none';
        geotechnicContent.style.display = 'none';
    }

    // Function to attach tab click event listeners
    function attachTabEventListeners() {
        tabs.geometry.addEventListener('click', function () {
            setActiveTab(tabs.geometry);
            hideAllContent();
            geometryContent.style.display = 'block';
            window.location.href = "loadtable:state"; // Request Python to provide table state
        });

        tabs.material.addEventListener('click', function () {
            setActiveTab(tabs.material);
            hideAllContent();
            materialContent.style.display = 'block';

            // Show the Add Material button
            const addMaterialButton = document.getElementById('add-material-button');
            if (addMaterialButton) {
                addMaterialButton.style.display = 'inline-block'; // or 'block' as needed
            }

            // Load materials from Excel file when the material tab is activated
            if (!window.materialsLoaded) {
                loadMaterialsFromExcel();
                window.materialsLoaded = true;
            }
        });

        tabs.load.addEventListener('click', function () {
            setActiveTab(tabs.load);
            hideAllContent();
            loadContent.style.display = 'block';
            // attachSliderEvent(); // Attach slider event after changing content
        });

        tabs.geotechnic.addEventListener('click', function () {
            setActiveTab(tabs.geotechnic);
            hideAllContent();
            geotechnicContent.style.display = 'block';
        });
    }


    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    //   ██████╗ ███████╗ ██████╗ ███╗   ███╗███████╗████████╗██████╗ ██╗   ██╗    ████████╗ █████╗ ██████╗ 
    //  ██╔════╝ ██╔════╝██╔═══██╗████╗ ████║██╔════╝╚══██╔══╝██╔══██╗╚██╗ ██╔╝    ╚══██╔══╝██╔══██╗██╔══██╗
    //  ██║  ███╗█████╗  ██║   ██║██╔████╔██║█████╗     ██║   ██████╔╝ ╚████╔╝        ██║   ███████║██████╔╝
    //  ██║   ██║██╔══╝  ██║   ██║██║╚██╔╝██║██╔══╝     ██║   ██╔══██╗  ╚██╔╝         ██║   ██╔══██║██╔══██╗
    //  ╚██████╔╝███████╗╚██████╔╝██║ ╚═╝ ██║███████╗   ██║   ██║  ██║   ██║          ██║   ██║  ██║██████╔╝
    //   ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝          ╚═╝   ╚═╝  ╚═╝╚═════╝ 
    //                                                                                                      
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    class Element {
        constructor(name, geometries, thickness) {
            this.name = name;
            this.geometries = geometries;
            this.thickness = thickness;
        }
    }


    // Listen for the 'elementsLoaded' event dispatched from Python
    window.addEventListener('elementsLoaded', function () {
        console.log("'elementsLoaded' event received");
        // Re-initialize elementsList from localStorage
        elementsList = getElementsFromLocalStorage();
        console.log("elementsList loaded from localStorage:", elementsList);
        // Rebuild the table
        writeTableRow();
    });

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Attach button events to add and remove rows
    ///////////////////////////////////////////////////////////////////////////////////////////

    document.getElementById('button-1').addEventListener('click', function () {
        addTableRow();
    });

    document.getElementById('button-3').addEventListener('click', function () {
        const activeRow = document.querySelector('.active-row');
        if (activeRow) {
            // Find the index of the row being removed
            const elementIndex = activeRow.dataset.elementIndex;
            const element = elementsList[elementIndex]; // Get the element before removing
            elementsList.splice(elementIndex, 1); // Remove the element from the elementsList array
    
            activeRow.remove();
            updateElementIndices(); // Update indices after removal
            saveElementsToLocalStorage(); // Update local storage after removal
    
            // Notify Python of the deletion
            window.location.href = `deleteelement:delete?name=${encodeURIComponent(element.name)}`;
        } else {
            alert("Please select a row to remove.");
        }
    });

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Write table                                                                                 
    ///////////////////////////////////////////////////////////////////////////////////////////

    function writeTableRow() {
        const tableBody = document.querySelector('#geometry-table tbody');
        tableBody.innerHTML = ""; // Clear existing rows before writing new ones

        if (elementsList && elementsList.length > 0) {
            elementsList.forEach((element, index) => {
                addTableRow(element.name, element.thickness, index);
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    // TABLE 
    ///////////////////////////////////////////////////////////////////////////////////////////

    // Modified addTableRow function to use the new save function
    function addTableRow(name = "", thickness = "", elementIndex = null) {
        const tableBody = document.querySelector('#geometry-table tbody');
        const newRow = tableBody.insertRow();

        let nameCell = newRow.insertCell(0);
        let thicknessCell = newRow.insertCell(1);
        let buttonCell = newRow.insertCell(2);

        nameCell.innerHTML = `<input type="text" value="${name}" class="geometry-name" placeholder="Enter name" />`;
        thicknessCell.innerHTML = `<input type="number" value="${thickness}" class="geometry-thickness" placeholder="Enter thickness" />`;
        buttonCell.innerHTML = `<button class="add-geo">Add Geo</button>`;

        let element;

        if (elementIndex !== null && elementsList[elementIndex]) {
            // Use existing element
            element = elementsList[elementIndex];
        } else {
            // Create new element
            element = new Element(name, [], thickness);
            elementsList.push(element);
            elementIndex = elementsList.length - 1;
        }

        // Store element index in row's data attribute
        newRow.dataset.elementIndex = elementIndex;

        // Add event listeners to input fields to update element
        const nameInput = nameCell.querySelector('.geometry-name');
        const thicknessInput = thicknessCell.querySelector('.geometry-thickness');

        nameInput.addEventListener('change', function () {
            const updatedName = nameInput.value;
            element.name = updatedName;
            saveElementsToLocalStorage();
            // NEW: send full updated data to Python
            sendUpdatedElementsToPython();
        });

        thicknessInput.addEventListener('change', function () {
            const updatedThickness = thicknessInput.value;
            element.thickness = updatedThickness;
            saveElementsToLocalStorage();
            // NEW: send full updated data to Python
            sendUpdatedElementsToPython();
        });

        // Add click event for the Add Geo button
        buttonCell.querySelector('.add-geo').addEventListener('click', function () {
            const geometryName = element.name;
            const geometryThickness = element.thickness;
            if (geometryName && !isNaN(geometryThickness)) {
                console.log('Element Selected for Geo:', element);
                // Save the updated elements list to local storage
                saveElementsToLocalStorage();
                // Notify Python of the new geometry (if required)
                window.location.href = `geometryupdate:geo?${encodeURIComponent(geometryName)},${geometryThickness}`;
            } else {
                alert("Please fill all fields to create an element.");
            }
        });

        attachRowClickEvents();
        saveElementsToLocalStorage(); // Save state after adding a new row
        // No need to notify Python
    }

    function attachRowClickEvents() {
        document.querySelectorAll('#geometry-table tbody tr').forEach(row => {
            row.addEventListener('click', function () {
                document.querySelectorAll('#geometry-table tbody tr').forEach(r => r.classList.remove('active-row'));
                row.classList.add('active-row');
            });
        });
    }
    
    // function sendUpdatedElementsToPython() {
    //     // Rebuild the entire elementsList from localStorage or from memory:
    //     // (If your local `elementsList` is always in sync, you can just do this)
    //     const elementsJson = JSON.stringify(elementsList);
    
    //     // Construct a special URL that triggers the "updateelements" event
    //     // in the Python code:
    //     window.location.href = 
    //         "updateelements:update?data=" + encodeURIComponent(elementsJson);
    // }

    function sendUpdatedElementsToPython() {
        const EFM = {
            GeomDict: {
                Elements: elementsList // your existing array of {name, thickness, geometries=[]}
            }
            // If you have other nested dicts, define them similarly
            // MatDict: { ... },
            // LoadDict: { ... },
            // etc.
        };
        const efmJson = JSON.stringify(EFM);
        window.location.href = "updateelements:update?data=" + encodeURIComponent(efmJson);
    }
    

    ///////////////////////////////////////////////////////////////////////////////////////////
    // LOCAL STORAGE HANDLING
    ///////////////////////////////////////////////////////////////////////////////////////////

    function saveElementsToLocalStorage() {
        localStorage.setItem('elementsList', JSON.stringify(elementsList));
        // sendUpdatedElementsToPython(); // Send updated data to Python
    }

    // Modify getElementsFromLocalStorage function
    function getElementsFromLocalStorage() {
        const storedElements = localStorage.getItem('elementsList');
        if (storedElements) {
            try {
                const elementsArray = JSON.parse(storedElements);
                // Convert plain objects to Element instances
                const elementsInstances = elementsArray.map(elementData => {
                    return new Element(elementData.name, elementData.geometries, elementData.thickness);
                });
                console.log("Elements loaded from localStorage:", elementsInstances);
                return elementsInstances;
            } catch (e) {
                console.error("Error parsing elements from localStorage:", e);
                return [];
            }
        } else {
            console.log("No elements in localStorage");
            return [];
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    // UNDO ACTIONS HANDLING
    ///////////////////////////////////////////////////////////////////////////////////////////

    function updateElementIndices() {
        // Update element indices stored in row data attributes after any changes
        document.querySelectorAll('#geometry-table tbody tr').forEach((row, index) => {
            row.dataset.elementIndex = index;
        });
    }
    
    // Undo example if needed:c
    let historyStack = [];
    function undoLastAction() {
        if (historyStack.length > 0) {
            const lastState = historyStack.pop();
            loadTableStateFromSticky(lastState);
        } else {
            alert("No actions to undo.");
        }
    }

    // Attach event listener for Ctrl + Z to undo the last action
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            undoLastAction();
        }
    });
  
    ///////////////////////////////////////////////////////////////////////////////////////////
    // SLIDER 
    ///////////////////////////////////////////////////////////////////////////////////////////

    // Get URL parameters for initial slider values
    const sliderIds = ["slider1", "slider255"];
       
    sliderIds.forEach(function (id) {
        const element = document.getElementById(id);
        if (element) {
            // Retrieve stored value or set to default if not found
            let storedValue = localStorage.getItem(id);
            if (storedValue === null) {
                storedValue = 50;  // Default value
                localStorage.setItem(id, storedValue);  // Set the default value to localStorage
                console.log(`Setting initial value for ${id} to default: ${storedValue}`);
            } else {
                console.log(`Setting ${id} to stored value: ${storedValue}`);
            }

            element.value = storedValue;  // Set the slider to the retrieved/stored value
        } else {
            console.error(`Slider with ID ${id} not found.`);
        }
    });

    // Add event listeners to store values when they change
    sliderIds.forEach(function (id) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function () {
                console.log(`Updating ${id} to value: ${element.value}`);
                localStorage.setItem(id, element.value);
                window.location.href = `sliderupdate:slider?${id}=${element.value}`;
            });
        }
    }); 
    
    // Attach the initial events
    attachTabEventListeners();
    // Write table rows from local storage when the page is loaded
    writeTableRow();
    
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    //  ███╗   ███╗ █████╗ ████████╗███████╗██████╗ ██╗ █████╗ ██╗         ████████╗ █████╗ ██████╗     
    //  ████╗ ████║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██║██╔══██╗██║         ╚══██╔══╝██╔══██╗██╔══██╗    
    //  ██╔████╔██║███████║   ██║   █████╗  ██████╔╝██║███████║██║            ██║   ███████║██████╔╝    
    //  ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║██╔══██║██║            ██║   ██╔══██║██╔══██╗    
    //  ██║ ╚═╝ ██║██║  ██║   ██║   ███████╗██║  ██║██║██║  ██║███████╗       ██║   ██║  ██║██████╔╝    
    //  ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝       ╚═╝   ╚═╝  ╚═╝╚═════╝     
    //                                                                                                  
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    
    // Function to handle file upload and parse the Excel file
    function handleFileUpload(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to JSON (array of arrays)
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Get the first row (field names) and the rest as material data
            fieldNames = sheetData[0]; // Store the header row
            materialsData = sheetData.slice(1).map(row => {
                let material = {};
                fieldNames.forEach((name, i) => {
                    material[name] = row[i];
                });
                return material;
            });
            console.log("Materials loaded:", materialsData);
        };

        reader.readAsArrayBuffer(file);
    }

    // Attach the file upload event listener
    document.getElementById('excel-file-input').addEventListener('change', handleFileUpload);


    

    // Add Material Button Event Listener
    document.getElementById('add-material-button').addEventListener('click', function () {
        if (materialsData.length > 0) {
            addMaterialSection();
        } else {
            alert('Please upload a materials Excel file first.');
        }
    });

    // Function to Add Material Section with dropdown and auto-fill functionality
    function addMaterialSection() {
        const materialList = document.getElementById('material-list');
        const materialIndex = materialList.childElementCount + 1;
    
        // Main container for the material section
        const materialContainer = document.createElement('div');
        materialContainer.classList.add('material-container');
        materialContainer.setAttribute('data-material-index', materialIndex);
    
        // Header for the material section
        const materialHeader = document.createElement('div');
        materialHeader.classList.add('material-header');
    
        // Editable title for the material
        const materialTitleInput = document.createElement('input');
        materialTitleInput.type = 'text';
        materialTitleInput.value = `Material ${materialIndex}`;
        materialTitleInput.classList.add('material-title-input');
    
        // Dropdown for selecting a material
        const materialSelect = document.createElement('select');
        materialSelect.classList.add('material-select');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Material';
        materialSelect.appendChild(defaultOption);
    
        // Populate the dropdown with material names from the Excel file
        materialsData.forEach(material => {
            const option = document.createElement('option');
            option.value = material['Name']; // Assuming the name is in the "Name" column
            option.textContent = material['Name'];
            materialSelect.appendChild(option);
        });
    
        // When a material is selected, fill in the properties
        materialSelect.addEventListener('change', function() {
            const selectedMaterialName = materialSelect.value;
            const selectedMaterial = materialsData.find(material => material['Name'] === selectedMaterialName);
            if (selectedMaterial) {
                materialTitleInput.value = selectedMaterial['Name'];
                fieldNames.forEach(fieldName => {
                    const inputField = materialContainer.querySelector(`[data-field-name="${fieldName}"]`);
                    if (inputField) {
                        inputField.value = selectedMaterial[fieldName] || '';
                    }
                });
            }
        });
    
        // Delete button for the material section
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', function () {
            materialList.removeChild(materialContainer);
        });
    
        // Add elements to the header
        materialHeader.appendChild(materialTitleInput);
        materialHeader.appendChild(materialSelect);
        materialHeader.appendChild(deleteButton);
    
        // Container for material properties
        const materialContent = document.createElement('div');
        materialContent.classList.add('material-content');
        materialContent.style.display = 'block';
    
        // Add inputs for each field in fieldNames
        fieldNames.forEach(function(fieldName) {
            const inputContainer = document.createElement('div');
            inputContainer.classList.add('input-container');
    
            const inputLabel = document.createElement('label');
            inputLabel.textContent = fieldName;
            inputLabel.classList.add('material-input-label');
    
            const inputField = document.createElement('input');
            inputField.type = determineInputType(fieldName);
            inputField.placeholder = fieldName;
            inputField.classList.add('material-input');
            inputField.setAttribute('data-field-name', fieldName);
    
            inputContainer.appendChild(inputLabel);
            inputContainer.appendChild(inputField);
            materialContent.appendChild(inputContainer);
        });
    
        // Append the header and content to the main container
        materialContainer.appendChild(materialHeader);
        materialContainer.appendChild(materialContent);
    
        // Add the material container to the list
        materialList.appendChild(materialContainer);
    }

    // Determine input type based on field name
    function determineInputType(fieldName) {
        const lowerFieldName = fieldName.toLowerCase();
        if (lowerFieldName.includes('date')) {
            return 'date';
        } else if (lowerFieldName.includes('number') || lowerFieldName.includes('modulus') || lowerFieldName.includes('density')) {
            return 'number';
        } else {
            return 'text';
        }
    }

    // Initialize tab event listeners
    attachTabEventListeners();
});

