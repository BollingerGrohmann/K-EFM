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
                // loadMaterialsFromExcel();
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
    

    window.addEventListener('materialDataLoaded', function () {
        console.log("materialDataLoaded event received from Python");
        // At this point, Python will have assigned: window.materialData
        // which should look like { fieldNames: [...], rows: [ {...}, {...}, ... ] }
        if (window.materialData) {
            fieldNames = window.materialData.fieldNames || [];
            materialsData = window.materialData.rows || [];
            console.log("Materials loaded:", materialsData);
        }
    });

    // Listen for the stored material objects from EFM["MatDict"]["Materials"]
    // We'll store them in localStorage as 'materialsList', then rebuild the UI if needed
    window.addEventListener('materialsLoaded', function () {
        console.log("materialsLoaded event from Python");
        const stored = localStorage.getItem('materialsList');
        if (stored) {
            try {
                materialsList = JSON.parse(stored);
                console.log("materialsList loaded from localStorage:", materialsList);

                // Rebuild the existing UI from materialsList if you want them displayed immediately
                rebuildMaterialsUI();
            } 
            catch (err) {
                console.error("Error parsing materialsList from localStorage:", err);
                materialsList = [];
            }
        }
    });

    // Rebuild the UI from materialsList
    function rebuildMaterialsUI() {
        // Clear existing
        const materialListDiv = document.getElementById('material-list');
        materialListDiv.innerHTML = "";

        // For each material in materialsList, create a container
        materialsList.forEach((matItem, index) => {
            addMaterialSection(matItem, index);
        });
    }

     // ANY expanded => arrow is expanded. If none => arrow is collapsed.
    function updateGlobalArrowState() {
        const managerHeader = document.getElementById('material-manager-header');
        const allHeaders = document.querySelectorAll('.material-container .material-header');

        let anyExpanded = false;
        allHeaders.forEach(h => {
            if (h.classList.contains('expanded')) {
                anyExpanded = true;
            }
        });
        // If ANY is expanded => arrow gets .expanded
        managerHeader.classList.toggle('expanded', anyExpanded);
    }
    
    // Global collapse/expand
    document.getElementById('material-manager-header')
    .addEventListener('click', function(e) {
        // Ignore if user clicked the "Add Material" button so it doesn't also toggle
        if (e.target.id === 'add-material-button') return;

        const managerHeader = e.currentTarget;
        const isNowExpanding = !managerHeader.classList.contains('expanded');

        // Flip the manager arrow
        managerHeader.classList.toggle('expanded', isNowExpanding);

        // For each material container:
        const allMaterialHeaders = document.querySelectorAll('.material-container .material-header');
        const allMaterialContents = document.querySelectorAll('.material-container .material-content');

        allMaterialHeaders.forEach(h => {
        if (isNowExpanding) {
            // expand them
            h.classList.add('expanded');
        } else {
            // collapse them
            h.classList.remove('expanded');
        }
        });

        allMaterialContents.forEach(c => {
        if (isNowExpanding) {
            c.style.display = 'block';
            c.style.maxHeight = '500px';
            c.classList.add('expanded');
        } else {
            c.style.display = 'none';
            c.style.maxHeight = '0';
            c.classList.remove('expanded');
        }
        });
    });


    // Add Material 
    document.getElementById('add-material-button').addEventListener('click', function () {
        if (materialsData.length > 0) {
            // Create a new blank material entry in materialsList
            const newMaterial = { 
                name: "NewMaterial" + (materialsList.length + 1), 
                // family: "", 
                // e: "", 
                // etc. fill in your fields
            };
            materialsList.push(newMaterial);
            
            // Build the UI
            addMaterialSection(newMaterial, materialsList.length - 1);
            // Save + push to Python
            saveMaterialsToLocalStorage();
            sendUpdatedMaterialsToPython();
            
            // addMaterialSection();

        } else {
            alert('Please upload a materials Excel file first.');
        }
    });

    // Function to Add Material Section with dropdown and auto-fill functionality
    function addMaterialSection(matItem, materialIndex) {
        const materialList = document.getElementById('material-list');

    
        // Main container for the material section
        const materialContainer = document.createElement('div');
        materialContainer.classList.add('material-container');
        materialContainer.setAttribute('data-material-index', materialIndex);
            
        // Header for the material section
        const materialHeader = document.createElement('div');
        materialHeader.classList.add('material-header');

        materialHeader.addEventListener('click', function() {
            // If expanded, collapse; if collapsed, expand
            if (materialHeader.classList.contains('expanded')) {
              // collapse
              materialHeader.classList.remove('expanded');
              materialContent.classList.remove('expanded');
              // Hide
              materialContent.style.display = 'none';
              materialContent.style.maxHeight = '0';
            } else {
              // expand
              materialHeader.classList.add('expanded');
              materialContent.classList.add('expanded');
              // Show
              materialContent.style.display = 'block';
              materialContent.style.maxHeight = '500px';
            }
            updateGlobalArrowState();  // <-- ADD THIS
        });

    
        // Editable title for the material
        const materialTitleInput = document.createElement('input');
        materialTitleInput.type = 'text';
        // If user had saved a name, show it:
        materialTitleInput.value = matItem.name || `Material ${materialIndex + 1}`;
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

        // if (matItem.name) {  
        //     materialSelect.value = matItem.name;  // <-- CRUCIAL
        // }
        // Then do the conditional
    if (matItem.name) {
        const fromExcelRow = materialsData.find(m => m["Name"] === matItem.name);
        if (fromExcelRow) {
            materialSelect.value = matItem.name; 
        } else {
            materialSelect.value = '';
        }
    }
    
        // When a material is selected, fill in the properties
        materialSelect.addEventListener('change', function() {
            const selectedName  = materialSelect.value;
            const fromExcel = materialsData.find(m => m['Name'] === selectedName);
            if (fromExcel) {
                // copy fields from the Excel row
                // e.g. matItem.name = fromExcel["Name"];
                matItem.name = fromExcel["Name"];
                fieldNames.forEach(field => {
                    // Suppose matItem has the same property name
                    // or you store it differently
                    matItem[field] = fromExcel[field];
                });

                materialTitleInput.value = fromExcel["Name"];

                // Also fill out the input fields below
                fieldNames.forEach(fieldName => {
                    const inp = materialContainer.querySelector(`[data-field-name="${fieldName}"]`);
                    if (inp) {
                        inp.value = fromExcel[fieldName] || '';
                    }
                });
            }
            saveMaterialsToLocalStorage();
            sendUpdatedMaterialsToPython();

        });
    
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        
        // STOP event from toggling arrow
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation();  // <<-- important so it won't also collapse/expand

            // Remove from the DOM
            materialList.removeChild(materialContainer);
            // Also remove from materialsList
            materialsList.splice(materialIndex, 1);

            // Re-save + notify Python
            saveMaterialsToLocalStorage();
            sendUpdatedMaterialsToPython();

            // Also re-check global arrow if needed
            updateGlobalArrowState();  // <<-- in case that was the last tray expanded
        });
   
        // Add elements to the header
        materialHeader.appendChild(materialTitleInput);
        materialHeader.appendChild(materialSelect);
        materialHeader.appendChild(deleteButton);
    
        // Container for material properties
        const materialContent = document.createElement('div');
        materialContent.classList.add('material-content');
    
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

            // If matItem already has a value for fieldName
            inputField.value = matItem[fieldName] || '';

            // On change, update matItem + push to Python
            inputField.addEventListener('change', function() {
                matItem[fieldName] = inputField.value;
                saveMaterialsToLocalStorage();
                sendUpdatedMaterialsToPython();
            });
    
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

    // Save & load user-chosen materials
    function saveMaterialsToLocalStorage() {
        localStorage.setItem('materialsList', JSON.stringify(materialsList));
    }

    function sendUpdatedMaterialsToPython() {
        // Suppose you store materials in a structure similar to
        //  { MatDict: { Materials: [ { name, family, e, ...}, ... ] } }
        const matData = {
            MatDict: {
                Materials: materialsList // your list of user-chosen materials
            }
        };
    
        const matJson = JSON.stringify(matData);
        window.location.href = "updatematerials:update?data=" + encodeURIComponent(matJson);
    }

    // Initialize tab event listeners
    attachTabEventListeners();
});

