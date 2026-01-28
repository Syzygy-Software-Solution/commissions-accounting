sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Input",
    "sap/m/ColumnListItem",
    "sap/m/ComboBox"
], (Controller, JSONModel, MessageToast, MessageBox, BusyIndicator, Fragment, Column, Text, Input, ColumnListItem, ComboBox) => {
    "use strict";

    return Controller.extend("commissionsaccounting.controller.Main", {
        async onInit() {
            // Initialize empty model
            const oModel = new JSONModel({
                overview: [],
                schedule: [],
                setupForm: {
                    selectedProduct: null,
                    capPercent: null,
                    paymentStartDate: null
                },
                currentSetups: [],
                selectedSetupIndex: undefined
            });
            this.getView().setModel(oModel);

            var oSetupsModel = new JSONModel([]);
            this.getView().setModel(oSetupsModel, "currentSetups");

            var oScheduleModel = new JSONModel([]);
            this.getView().setModel(oScheduleModel, "scheduleData");

            var oOverviewModel = new JSONModel([]);
            this.getView().setModel(oOverviewModel, "overviewData");

            var oPeriodsModel = new JSONModel([]);
            this.getView().setModel(oPeriodsModel, "periodsData");

            var oProductIdsModel = new JSONModel([]);
            this.getView().setModel(oProductIdsModel, "productIds");

            // Hardcoded data - commented out, now fetching from database
            // var oDataSourceModel = new JSONModel([
            //     { columnKey: "productId", columnName: "Product Id", defaultLabel: "Product Id", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "productCategory", columnName: "Product Category", defaultLabel: "Product Category", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "commissionsCategory", columnName: "Commissions Category", defaultLabel: "Commissions Category", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "capPercent", columnName: "CAP %", defaultLabel: "CAP %", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "term", columnName: "Term", defaultLabel: "Term", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "amortizationFrequency", columnName: "Amortization Frequency", defaultLabel: "Amortization Frequency", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "payrollClassification", columnName: "Payroll Classification", defaultLabel: "Payroll Classification", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "amortizationStartMonth", columnName: "Amortization start month", defaultLabel: "Amortization start month", customLabel: "", tableName: "", fieldName: "", isActive: true },
            //     { columnKey: "genericAttr1", columnName: "Generic Attribute 1", defaultLabel: "Generic Attribute 1", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr2", columnName: "Generic Attribute 2", defaultLabel: "Generic Attribute 2", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr3", columnName: "Generic Attribute 3", defaultLabel: "Generic Attribute 3", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr4", columnName: "Generic Attribute 4", defaultLabel: "Generic Attribute 4", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr5", columnName: "Generic Attribute 5", defaultLabel: "Generic Attribute 5", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr6", columnName: "Generic Attribute 6", defaultLabel: "Generic Attribute 6", customLabel: "", tableName: "", fieldName: "", isActive: false },
            //     { columnKey: "genericAttr7", columnName: "Generic Attribute 7", defaultLabel: "Generic Attribute 7", customLabel: "", tableName: "", fieldName: "", isActive: false }
            // ]);
            // this.getView().setModel(oDataSourceModel, "dataSources");

            var oDataSourceModel = new JSONModel([]);
            this.getView().setModel(oDataSourceModel, "dataSources");

            var oTableNamesModel = new JSONModel([]);
            this.getView().setModel(oTableNamesModel, "tableNames");

            var oColumnConfigModel = new JSONModel([]);
            this.getView().setModel(oColumnConfigModel, "columnConfig");

            // Initialize cache for dropdown data and file references early
            this._dropdownCache = {};
            this._oSelectedFile = null;

            // Load periods and data source mappings first
            await Promise.all([
                this.getAllPeriods(),
                this.getActiveDataSourceMappings()
            ]);
            
            // Then load current setups after column config is available
            await this.getCurrentSetups();

            // Build the dynamic setups table after data is loaded
            await this._buildDynamicSetupsTable();

            // Load SheetJS library asynchronously
            this._loadSheetJS();
        },

        _loadSheetJS() {
            // Load SheetJS from CDN using dynamic import pattern
            if (!window.XLSX) {
                const script = document.createElement("script");
                script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
                script.async = true;
                script.onload = () => { 
                    console.log("SheetJS library loaded successfully");
                };
                script.onerror = () => {
                    console.error("Failed to load SheetJS library");
                };
                document.head.appendChild(script);
            }
        },

        onToggleMenuPress(oEvent){
            const oToolPage = this.getView().byId("idToolPage");
            var bSideExpanded = oToolPage.getSideExpanded();
			// this._setToggleButtonTooltip(bSideExpanded);
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        async onSideNavItemSelect(oEvent){
            const sSelectedKey = oEvent.getParameter("item").getKey();
            switch (sSelectedKey) {
                case "amortizationDetails":
                    break;
                case "configAmortization":
                    BusyIndicator.show();
                    // Load active data source mappings and build dynamic table
                    await this.getActiveDataSourceMappings();
                    BusyIndicator.hide();
                    break;
                default:
                    break;
            }
            this.getView().byId("idNavContainer").to(this.getView().createId(sSelectedKey));
        },

        async onConfigSubSectionChange(oEvent) {
            const oSubSection = oEvent.getParameter("subSection");
            const sSectionTitle = oSubSection.getParent().getTitle();
            
            // Load data when navigating to Setup section
            if (sSectionTitle === "Setup") {
                BusyIndicator.show(0);
                
                try {
                    // Always rebuild table and fetch data to ensure everything is loaded correctly
                    await this._buildDynamicSetupsTable();
                    
                    // Check if data needs to be fetched
                    const oSetupsModel = this.getView().getModel("currentSetups");
                    const aCurrentSetups = oSetupsModel.getData();
                    
                    if (!aCurrentSetups || aCurrentSetups.length === 0) {
                        // No data, fetch it
                        await this.getCurrentSetups();
                    } else {
                        // Data already loaded, ensure dropdowns are populated
                        await this._ensureDropdownDataLoaded();
                        this._populateAllComboBoxes();
                    }
                } catch (error) {
                    console.error("Error loading setup data:", error);
                    MessageBox.error("Failed to load setup data: " + error.message);
                } finally {
                    BusyIndicator.hide();
                }
            }
            
            // Load data when navigating to Data Source Mapping section
            if (sSectionTitle === "Data Source Mapping") {
                BusyIndicator.show();
                
                // Check if data is already loaded
                const oDataSourcesModel = this.getView().getModel("dataSources");
                const oTableNamesModel = this.getView().getModel("tableNames");
                const aCurrentMappings = oDataSourcesModel.getData();
                const aCurrentTables = oTableNamesModel.getData();
                
                const aPromises = [];
                
                // Only fetch table names if not already loaded
                if (!aCurrentTables || aCurrentTables.length === 0) {
                    aPromises.push(this.getDataSourceTables());
                }
                
                // Only fetch mappings if not already loaded
                if (!aCurrentMappings || aCurrentMappings.length === 0) {
                    aPromises.push(this.getDataSourceMappings());
                } else {
                    // Data is already loaded, just load missing field names if any
                    aPromises.push(this._loadMissingFieldNames(aCurrentMappings));
                }
                
                await Promise.all(aPromises);
                BusyIndicator.hide();
            }
        },

        async _loadMissingFieldNames(aMappings) {
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri
            );
            const oDataSourcesModel = this.getView().getModel("dataSources");

            // Only load field names for rows that have a table name but no field names loaded
            const aPromises = aMappings.map(async (mapping, index) => {
                if (mapping.tableName && (!mapping._fieldNames || mapping._fieldNames.length === 0)) {
                    try {
                        const response = await fetch(`${sUrl}/V_CS_TABLE_COLUMNS/V_CS_TABLE_COLUMNS?$filter=TABLE_NAME eq '${mapping.tableName}'`);
                        if (response.ok) {
                            const data = await response.json();
                            const aColumns = data.value || [];
                            oDataSourcesModel.setProperty(`/${index}/_fieldNames`, aColumns);
                        }
                    } catch (error) {
                        console.error(`Error loading field names for ${mapping.tableName}:`, error);
                    }
                }
            });

            await Promise.all(aPromises);
            if (aPromises.length > 0) {
                oDataSourcesModel.refresh();
            }
        },

        async getDataSourceTables(){
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri);

            try {
                const response = await fetch(`${sUrl}/V_CS_TABLES/V_CS_TABLES`);
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const data = await response.json();
                const aTables = data.value || [];
                
                // Filter to keep only specific tables
                const allowedTables = [
                    "CS_SALESTRANSACTION",
                    "CS_TRANSACTIONASSIGNMENT",
                    "CS_COMMISSION",
                    "CS_CREDIT",
                    "CS_INCENTIVE",
                    "CS_MEASUREMENT",
                    "CS_PARTICIPANT",
                    "CS_POSITION",
                    "CS_TITLE"
                ];
                
                const aFilteredTables = aTables.filter(table => 
                    allowedTables.includes(table.TABLE_NAME)
                );
                
                const oTableNamesModel = this.getView().getModel("tableNames");
                oTableNamesModel.setSizeLimit(aFilteredTables.length);
                oTableNamesModel.setData(aFilteredTables);
            } catch (error) {
                MessageBox.error("Error fetching tables: " + error.message);
                console.error("Error fetching tables:", error);
            }
        },

        async getDataSourceMappings(){
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri
            );

            BusyIndicator.show(0);
            try {
                const response = await fetch(`${sUrl}/DataSourceMappings`);
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const data = await response.json();
                let aMappings = data.value || [];
                
                // Sort by position
                aMappings.sort((a, b) => (a.position || 0) - (b.position || 0));
                
                // Initialize each row with an empty fieldNames array
                aMappings.forEach(mapping => {
                    mapping._fieldNames = [];
                });
                
                const oDataSourceModel = this.getView().getModel("dataSources");
                // Remove size limit to accommodate any number of records/fields in the future
                oDataSourceModel.setSizeLimit(999999);
                oDataSourceModel.setData(aMappings);

                // Fetch field names for all rows that have a table name
                await this._loadFieldNamesForAllRows(aMappings);
                this.getView().getModel("dataSources").refresh();
                MessageToast.show("Data source mappings loaded successfully");
            } catch (error) {
                MessageBox.error("Error fetching data source mappings: " + error.message);
                console.error("Error fetching data source mappings:", error);
            } finally {
                BusyIndicator.hide();
            }
        },

        async onTableNameChange(oEvent) {
            const oComboBox = oEvent.getSource();
            const sSelectedTable = oComboBox.getSelectedKey();
            const oBindingContext = oComboBox.getBindingContext("dataSources");
            
            if (!sSelectedTable) {
                return;
            }

            BusyIndicator.show(0);
            
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri);

            try {
                const response = await fetch(`${sUrl}/V_CS_TABLE_COLUMNS/V_CS_TABLE_COLUMNS?$filter=TABLE_NAME eq '${sSelectedTable}'`);
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const data = await response.json();
                const aColumns = data.value || [];
                
                // Update the field names for this specific row
                const oDataSourcesModel = this.getView().getModel("dataSources");
                const sPath = oBindingContext.getPath();
                oDataSourcesModel.setProperty(sPath + "/_fieldNames", aColumns);

            } catch (error) {
                MessageBox.error("Error fetching field names: " + error.message);
                console.error("Error fetching field names:", error);
            } finally {
                BusyIndicator.hide();
            }
        },

        async _loadFieldNamesForAllRows(aMappings) {
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri
            );
            const oDataSourcesModel = this.getView().getModel("dataSources");

            // Load field names for each row that has a table name and doesn't already have field names
            const aPromises = aMappings.map(async (mapping, index) => {
                if (mapping.tableName && (!mapping._fieldNames || mapping._fieldNames.length === 0)) {
                    try {
                        const response = await fetch(`${sUrl}/V_CS_TABLE_COLUMNS/V_CS_TABLE_COLUMNS?$filter=TABLE_NAME eq '${mapping.tableName}'`);
                        if (response.ok) {
                            const data = await response.json();
                            const aColumns = data.value || [];
                            oDataSourcesModel.setProperty(`/${index}/_fieldNames`, aColumns);
                        }
                    } catch (error) {
                        console.error(`Error loading field names for ${mapping.tableName}:`, error);
                    }
                }
            });

            await Promise.all(aPromises);
        },

        async onSaveDataSourceMapping() {
            BusyIndicator.show(0);
            
            try {
                const oDataSourceModel = this.getView().getModel("dataSources");
                const aDataSources = oDataSourceModel.getData();
                
                // Validate that at least one field is active
                const hasActiveFields = aDataSources.some(item => item.isActive);
                if (!hasActiveFields) {
                    MessageBox.warning("Please activate at least one field before saving.");
                    BusyIndicator.hide();
                    return;
                }
                
                // Validate for duplicate positions
                const positionMap = new Map();
                const duplicatePositions = [];

                for (let i = 0; i < aDataSources.length; i++) {
                    const item = aDataSources[i];
                    const position = parseInt(item.position, 10);

                    if (!isNaN(position)) {
                        if (positionMap.has(position)) {
                            duplicatePositions.push(position);
                        } else {
                            positionMap.set(position, i);
                        }
                    }
                }
                
                if (duplicatePositions.length > 0) {
                    MessageBox.error(`Duplicate positions found: ${[...new Set(duplicatePositions)].join(", ")}. Each column must have a unique position.`);
                    BusyIndicator.hide();
                    return;
                }
                
                // Prepare data for saving
                const aMappingData = aDataSources.map(item => {
                    const position = parseInt(item.position, 10);
                    return {
                        columnKey: item.columnKey,
                        columnName: item.columnName,
                        defaultLabel: item.defaultLabel,
                        customLabel: item.customLabel || null,
                        position: !isNaN(position) ? position : null,
                        tableName: item.tableName || null,
                        fieldName: item.fieldName || null,
                        isActive: item.isActive || false,
                        connectViaAPI: false
                    };
                });
                
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                    this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri
                );
                
                const response = await fetch(`${sUrl}/saveDataSourceMappings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ mappingData: aMappingData })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                MessageToast.show("Data source mappings saved successfully");
                
            } catch (error) {
                MessageBox.error(`Failed to save data source mappings: ${error.message}`);
            } finally {
                BusyIndicator.hide();
            }
        },

        async onUploadPress() {
            // Load and open the upload dialog
            if (!this._pUploadDialog) {
                this._pUploadDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.UploadDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            
            const oDialog = await this._pUploadDialog;
            oDialog.open();
        },

        onFileSelect(oEvent) {
            // Store the selected file when user selects a file
            const oFileUploader = oEvent.getSource();
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            
            if (oFile) {
                this._oSelectedFile = oFile;
            } else {
                this._oSelectedFile = null;
            }
        },

        async onUploadFile() {
            // Check if file is selected
            if (!this._oSelectedFile) {
                MessageBox.warning("Please select a file to upload");
                return;
            }

            // Validate file type
            if (!this._oSelectedFile.name.match(/\.(xlsx|xls)$/)) {
                MessageBox.error("Please upload a valid Excel file (.xlsx or .xls)");
                return;
            }

            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Read and parse the Excel file
                const arrayBuffer = await this._readFileAsArrayBuffer(this._oSelectedFile);
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
                
                // Read first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    MessageBox.warning("The uploaded Excel file is empty");
                    return;
                }

                // Validate required columns
                const requiredColumns = ["PayeeId", "Total Incentive", "Product", "Cap %", "Term", "Payment Frequency", "Payment Start Date"];
                const firstRow = jsonData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));

                if (missingColumns.length > 0) {
                    MessageBox.error(`Missing required columns: ${missingColumns.join(", ")}`);
                    return;
                }

                // Update model with parsed data
                const oModel = this.getView().getModel();
                oModel.setProperty("/overview", jsonData);

                const aDistinctPayeeIds = [...new Set(jsonData.map(item => item.PayeeId))].filter(Boolean);
                const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/payeeIds", aPayeeIdOptions);

                // Extract distinct Products for Setup form
                const aDistinctProducts = [...new Set(jsonData.map(item => item.Product))].filter(Boolean);
                const aProductOptions = aDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/products", aProductOptions);

                // Reset setup form
                oModel.setProperty("/setupForm", {
                    selectedProduct: null,
                    capPercent: null,
                    paymentStartDate: null
                });

                MessageToast.show(`Successfully loaded ${jsonData.length} record(s)`);
                
                // Calculate amortization schedule based on overview data
                this._calculateAmortizationSchedule(jsonData);

                // Close dialog and reset
                this.onCloseUploadDialog();

            } catch (error) {
                MessageBox.error("Error parsing Excel file: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        onCloseUploadDialog() {
            // Close dialog and clear file selection
            this._pUploadDialog.then((oDialog) => {
                oDialog.close();
                // Clear the file uploader
                const oFileUploader = this.byId("fileUploader");
                if (oFileUploader) {
                    oFileUploader.clear();
                }
                this._oSelectedFile = null;
            });
        },

        _readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error("Error reading file"));
                reader.readAsArrayBuffer(file);
            });
        },

        _calculateAmortizationSchedule(aOverviewData) {
            const oModel = this.getView().getModel();
            const aSchedule = [];

            aOverviewData.forEach((oRecord) => {
                try {
                    // Extract values from record with fallbacks
                    const payeeId = oRecord.PayeeId || "";
                    const product = oRecord.Product || "";
                    const totalIncentive = parseFloat(oRecord["Total Incentive"]) || 0;
                    const capPercent = parseFloat(oRecord["Cap %"]) || 100;
                    const term = parseInt(oRecord["Term"]) || 12;
                    
                    // Parse payment start date
                    let paymentStartDate;
                    if (oRecord["Payment Start Date"]) {
                        // Handle Excel date serial number or string date
                        if (typeof oRecord["Payment Start Date"] === "number") {
                            paymentStartDate = this._excelDateToJSDate(oRecord["Payment Start Date"]);
                        } else {
                            paymentStartDate = new Date(oRecord["Payment Start Date"]);
                        }
                    } else {
                        paymentStartDate = new Date();
                    }

                    // Get payout frequency (default to Monthly)
                    const payoutFreq = oRecord["Payment Frequency"] || "Monthly";
                    
                    // Map frequency to months
                    const freqMonths = {
                        "Monthly": 1,
                        "Quarterly": 3,
                        "Bi-Weekly": 2,
                        "Semi-Annually": 6,
                        "Annually": 12
                    }[payoutFreq] || 1;

                    // Calculate periods and payment amount
                    const periods = Math.floor(term / freqMonths);
                    const cappedTotal = totalIncentive * (capPercent / 100);
                    const paymentAmount = cappedTotal / periods;

                    // Generate schedule for this payee
                    let currentDate = new Date(paymentStartDate);
                    
                    for (let i = 1; i <= periods; i++) {
                        aSchedule.push({
                            PayeeId: payeeId,
                            Product: product,
                            Installment: i,
                            PaymentDate: this._formatDate(currentDate),
                            PaymentAmount: this._formatCurrency(paymentAmount)
                        });
                        
                        // Add months to current date
                        currentDate = this._addMonths(currentDate, freqMonths);
                    }
                } catch (error) {
                    console.error("Error calculating amortization for record:", oRecord, error);
                }
            });

            const oScheduleModel = this.getView().getModel("scheduleData");
            oScheduleModel.setData(aSchedule);
            
            // Clear any previous filter when new data is loaded
            oModel.setProperty("/scheduleOriginal", null);
            oModel.setProperty("/isFiltered", false);
            oModel.setProperty("/currentFilter", null);
        },

        async onDownloadTemplatePress() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            try {
                BusyIndicator.show(0);

                // Define template structure
                const templateData = [{
                    "PayeeId": "",
                    "Product": "",
                    "Total Incentive": "",
                    "Cap %": "",
                    "Term": "",
                    "Payment Frequency": "",
                    "Payment Start Date": "",
                    "Plan": "",
                    "Data Type": "",
                    "Data Type Name": "",
                    "Account Type": "",
                    "Payroll Classification": "",
                    "Expense Start Date": "",
                    "Expense End Date": "",
                    "Notes": ""
                }];

                // Create workbook and worksheet
                const ws = XLSX.utils.json_to_sheet(templateData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Template");

                // Set column widths for better readability
                ws['!cols'] = [
                    { wch: 15 },  // PayeeId
                    { wch: 15 },  // Product
                    { wch: 18 },  // Total Incentive
                    { wch: 10 },  // Cap %
                    { wch: 10 },  // Term
                    { wch: 20 },  // Payment Frequency
                    { wch: 20 },  // Payment Start Date
                    { wch: 15 },  // Plan
                    { wch: 15 },  // Data Type
                    { wch: 18 },  // Data Type Name
                    { wch: 15 },  // Account Type
                    { wch: 22 },  // Payroll Classification
                    { wch: 20 },  // Expense Start Date
                    { wch: 20 },  // Expense End Date
                    { wch: 30 }   // Notes
                ];

                // Generate and download file
                XLSX.writeFile(wb, "Commissions_Template.xlsx");
                
                MessageToast.show("Template downloaded successfully");

            } catch (error) {
                MessageBox.error("Error generating template: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        async onDownloadSetupTemplatePress() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            if (!oColumnConfig || oColumnConfig.length === 0) {
                MessageBox.warning("Please configure data source mappings first.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Create template data with dynamic column headers based on configuration
                const oTemplateRow = {};
                oColumnConfig.forEach(colConfig => {
                    oTemplateRow[colConfig.columnName] = "";
                });

                const aTemplateData = [oTemplateRow];

                // Create worksheet
                const ws = XLSX.utils.json_to_sheet(aTemplateData);

                // Set column widths dynamically
                ws['!cols'] = oColumnConfig.map(() => ({ wch: 20 }));

                // Create workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Setup Template");

                // Generate file
                XLSX.writeFile(wb, "Setup_Template.xlsx");

                MessageToast.show("Setup template downloaded successfully");
            } catch (error) {
                MessageBox.error("Error generating template: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        async onDownloadAmortizationTemplatePress() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Create template data with columns from hardcoded aPayeeData
                const aTemplateData = [
                    {
                        "payeeId": "",
                        "orderId": "",
                        "product": "",
                        "totalIncentive": ""
                    }
                ];

                // Create worksheet
                const ws = XLSX.utils.json_to_sheet(aTemplateData);

                // Set column widths
                ws['!cols'] = [
                    { wch: 15 },  // payeeId
                    { wch: 15 },  // orderId
                    { wch: 15 },  // product
                    { wch: 20 }   // totalIncentive
                ];

                // Create workbook
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Amortization Template");

                // Generate file
                XLSX.writeFile(wb, "Amortization_Template.xlsx");

                MessageToast.show("Amortization template downloaded successfully");
            } catch (error) {
                MessageBox.error("Error generating template: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        onDownloadSchedulePress() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            const oScheduleModel = this.getView().getModel("scheduleData");
            const aScheduleData = oScheduleModel.getData();

            if (!aScheduleData || aScheduleData.length === 0) {
                MessageBox.warning("No schedule data available to download");
                return;
            }

            try {
                BusyIndicator.show(0);

                // Create workbook and worksheet from schedule data
                const ws = XLSX.utils.json_to_sheet(aScheduleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Amortization Schedule");

                // Set column widths for better readability
                ws['!cols'] = [
                    { wch: 15 },  // PayeeId
                    { wch: 15 },  // Installment
                    { wch: 18 },  // Payment Date
                    { wch: 18 }   // Payment Amount
                ];

                // Generate filename with current date
                const currentDate = new Date().toISOString().split('T')[0];
                const filename = `Amortization_Schedule_${currentDate}.xlsx`;

                // Generate and download file
                XLSX.writeFile(wb, filename);
                
                MessageToast.show(`Successfully downloaded ${aScheduleData.length} record(s)`);

            } catch (error) {
                MessageBox.error("Error generating Excel file: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        _excelDateToJSDate(excelDate) {
            // Excel stores dates as days since 1900-01-01 (with a leap year bug for 1900)
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            const daysOffset = excelDate > 59 ? 1 : 0; // Account for Excel's 1900 leap year bug
            const date = new Date((excelDate - 25569 + daysOffset) * millisecondsPerDay);
            return date;
        },

        _addMonths(date, months) {
            const newDate = new Date(date);
            newDate.setMonth(newDate.getMonth() + months);
            return newDate;
        },

        _formatDate(date) {
            // Format as YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        _formatCurrency(amount) {
            // Round to 2 decimal places and format
            return Math.round(amount * 100) / 100;
        },

        async onExecuteAmortizationPress() {
            BusyIndicator.show(0);

            try {
                // Fetch payee data from API
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                    this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri
                );
                
                const response = await fetch(`${sUrl}/SYZ_CA_AMRT_DETAIL/SYZ_CA_AMRT_DETAIL`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch amortization data: ${response.status}`);
                }
                
                const data = await response.json();
                const aPayeeData = data.value || [];
                
                if (aPayeeData.length === 0) {
                    MessageBox.warning("No amortization data found in the system.");
                    BusyIndicator.hide();
                    return;
                }

                // Get current setups
                const oSetupsModel = this.getView().getModel("currentSetups");
                const aSetups = oSetupsModel.getData() || [];

                if (aSetups.length === 0) {
                    MessageBox.warning("No setup data available. Please add setup configurations first.");
                    BusyIndicator.hide();
                    return;
                }

                // Filter data by configured products
                const aConfiguredProductIds = aSetups.map(setup => setup.productId);
                const aFilteredData = aPayeeData.filter(record => 
                    aConfiguredProductIds.includes(record.PRODUCTID)
                );
                const aUnconfiguredData = aPayeeData.filter(record => 
                    !aConfiguredProductIds.includes(record.PRODUCTID)
                );

                if (aFilteredData.length === 0) {
                    MessageBox.warning("No transactions found with configured product IDs. Please configure setups for the products in your data.");
                    BusyIndicator.hide();
                    return;
                }

                // Store raw API data for refresh functionality
                const oModel = this.getView().getModel();
                oModel.setProperty("/rawAmortizationData", aFilteredData);
                oModel.setProperty("/unconfiguredData", aUnconfiguredData);

                // Calculate amortization schedule
                const aSchedule = this._executeAmortizationCalculation(aFilteredData, aSetups);

                // Prepare overview data by combining payee data with setup details
                const aOverview = this._prepareOverviewData(aFilteredData, aSetups);

                // Update the schedule model
                const oScheduleModel = this.getView().getModel("scheduleData");
                oScheduleModel.setData(aSchedule);
                
                // Update the overview model
                const oOverviewModel = this.getView().getModel("overviewData");
                oOverviewModel.setData(aOverview);
                
                oModel.setProperty("/scheduleOriginal", null);
                oModel.setProperty("/overviewOriginal", null);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);

                // Extract distinct values for schedule filters
                const aDistinctPayeeIds = [...new Set(aSchedule.map(item => item.PayeeId))].filter(Boolean);
                const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayeeIds", aPayeeIdOptions);

                const aDistinctProducts = [...new Set(aSchedule.map(item => item.Product))].filter(Boolean);
                const aProductOptions = aDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/scheduleProducts", aProductOptions);

                const aDistinctPayrollClassifications = [...new Set(aSchedule.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aPayrollClassificationOptions = aDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayrollClassifications", aPayrollClassificationOptions);

                // Extract distinct values for overview filters
                const aOverviewDistinctPayeeIds = [...new Set(aOverview.map(item => item.PayeeId))].filter(Boolean);
                const aOverviewPayeeIdOptions = aOverviewDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayeeIds", aOverviewPayeeIdOptions);

                const aOverviewDistinctProducts = [...new Set(aOverview.map(item => item.Product))].filter(Boolean);
                const aOverviewProductOptions = aOverviewDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/overviewProducts", aOverviewProductOptions);

                const aOverviewDistinctPayrollClassifications = [...new Set(aOverview.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aOverviewPayrollClassificationOptions = aOverviewDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayrollClassifications", aOverviewPayrollClassificationOptions);

                // Clear all schedule multi combo box selections
                const oPayeeFilter = this.byId("schedulePayeeFilter");
                if (oPayeeFilter) {
                    oPayeeFilter.setSelectedKeys([]);
                }
                const oProductFilter = this.byId("scheduleProductFilter");
                if (oProductFilter) {
                    oProductFilter.setSelectedKeys([]);
                }
                const oPayrollClassificationFilter = this.byId("schedulePayrollClassificationFilter");
                if (oPayrollClassificationFilter) {
                    oPayrollClassificationFilter.setSelectedKeys([]);
                }

                // Clear all overview multi combo box selections
                const oOverviewPayeeFilter = this.byId("overviewPayeeFilter");
                if (oOverviewPayeeFilter) {
                    oOverviewPayeeFilter.setSelectedKeys([]);
                }
                const oOverviewProductFilter = this.byId("overviewProductFilter");
                if (oOverviewProductFilter) {
                    oOverviewProductFilter.setSelectedKeys([]);
                }
                const oOverviewPayrollClassificationFilter = this.byId("overviewPayrollClassificationFilter");
                if (oOverviewPayrollClassificationFilter) {
                    oOverviewPayrollClassificationFilter.setSelectedKeys([]);
                }

                let sMessage = `Amortization executed successfully: ${aSchedule.length} schedule entries and ${aOverview.length} overview records`;
                
                if (aUnconfiguredData.length > 0) {
                    const aUnconfiguredProducts = [...new Set(aUnconfiguredData.map(r => r.PRODUCTID))].join(", ");
                    MessageBox.information(
                        `${sMessage}\n\nNote: ${aUnconfiguredData.length} transaction(s) with unconfigured product(s) were skipped: ${aUnconfiguredProducts}. Configure these products to include them.`,
                        { title: "Amortization Complete" }
                    );
                } else {
                    MessageToast.show(sMessage);
                }

            } catch (error) {
                MessageBox.error("Error executing amortization: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        async onUploadAmortizationDataPress() {
            // Load and open the upload amortization data dialog
            if (!this._pUploadAmortizationDialog) {
                this._pUploadAmortizationDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.UploadAmortizationDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            
            const oDialog = await this._pUploadAmortizationDialog;
            oDialog.open();
        },

        onAmortizationFileSelect(oEvent) {
            // Store the selected amortization file when user selects a file
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            
            if (oFile) {
                this._oSelectedAmortizationFile = oFile;
            } else {
                this._oSelectedAmortizationFile = null;
            }
        },

        async onUploadAmortizationFile() {
            // Check if file is selected
            if (!this._oSelectedAmortizationFile) {
                MessageBox.warning("Please select a file to upload");
                return;
            }

            // Validate file type
            if (!this._oSelectedAmortizationFile.name.match(/\.(xlsx|xls)$/)) {
                MessageBox.error("Please upload a valid Excel file (.xlsx or .xls)");
                return;
            }

            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Read and parse the Excel file
                const arrayBuffer = await this._readFileAsArrayBuffer(this._oSelectedAmortizationFile);
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
                
                // Read first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    MessageBox.error("The uploaded file is empty");
                    BusyIndicator.hide();
                    return;
                }

                // Validate required columns
                const requiredColumns = ["payeeId", "orderId", "product", "totalIncentive"];
                const firstRow = jsonData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));

                if (missingColumns.length > 0) {
                    MessageBox.error(`Missing required columns: ${missingColumns.join(", ")}`);
                    BusyIndicator.hide();
                    return;
                }

                // Validate data
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row.payeeId || !row.orderId || !row.product || !row.totalIncentive) {
                        MessageBox.error(`Row ${i + 2}: All fields are required (payeeId, orderId, product, totalIncentive)`);
                        BusyIndicator.hide();
                        return;
                    }
                    
                    // Validate totalIncentive is a number
                    if (isNaN(parseFloat(row.totalIncentive)) || parseFloat(row.totalIncentive) <= 0) {
                        MessageBox.error(`Row ${i + 2}: totalIncentive must be a valid positive number`);
                        BusyIndicator.hide();
                        return;
                    }
                }

                // Close dialog
                this.onCloseUploadAmortizationDialog();

                MessageToast.show(`Successfully loaded ${jsonData.length} record(s)`);

                // Get setups from database
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                const response = await fetch(`${sUrl}/AmortizationSetups`);
                const data = await response.json();
                const aSetups = data.value || [];

                if (aSetups.length === 0) {
                    MessageBox.warning("No setup configuration found. Please add setup data before executing amortization.");
                    BusyIndicator.hide();
                    return;
                }

                // Prepare payee data from uploaded Excel
                const aPayeeData = jsonData.map(row => ({
                    payeeId: row.payeeId,
                    orderId: row.orderId,
                    product: row.product,
                    totalIncentive: parseFloat(row.totalIncentive)
                }));

                // Calculate amortization schedule
                const aSchedule = this._executeAmortizationCalculation(aPayeeData, aSetups);

                // Prepare overview data
                const aOverview = this._prepareOverviewData(aPayeeData, aSetups);

                // Update the schedule model
                const oScheduleModel = this.getView().getModel("scheduleData");
                oScheduleModel.setData(aSchedule);
                
                // Update the overview model
                const oOverviewModel = this.getView().getModel("overviewData");
                oOverviewModel.setData(aOverview);
                
                const oModel = this.getView().getModel();
                oModel.setProperty("/scheduleOriginal", null);
                oModel.setProperty("/overviewOriginal", null);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);

                // Extract distinct values for schedule filters
                const aDistinctPayeeIds = [...new Set(aSchedule.map(item => item.PayeeId))].filter(Boolean);
                const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayeeIds", aPayeeIdOptions);

                const aDistinctProducts = [...new Set(aSchedule.map(item => item.Product))].filter(Boolean);
                const aProductOptions = aDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/scheduleProducts", aProductOptions);

                const aDistinctPayrollClassifications = [...new Set(aSchedule.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aPayrollClassificationOptions = aDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayrollClassifications", aPayrollClassificationOptions);

                // Extract distinct values for overview filters
                const aOverviewDistinctPayeeIds = [...new Set(aOverview.map(item => item.PayeeId))].filter(Boolean);
                const aOverviewPayeeIdOptions = aOverviewDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayeeIds", aOverviewPayeeIdOptions);

                const aOverviewDistinctProducts = [...new Set(aOverview.map(item => item.Product))].filter(Boolean);
                const aOverviewProductOptions = aOverviewDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/overviewProducts", aOverviewProductOptions);

                const aOverviewDistinctPayrollClassifications = [...new Set(aOverview.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aOverviewPayrollClassificationOptions = aOverviewDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayrollClassifications", aOverviewPayrollClassificationOptions);

                // Clear all schedule multi combo box selections
                const oPayeeFilter = this.byId("schedulePayeeFilter");
                if (oPayeeFilter) {
                    oPayeeFilter.setSelectedKeys([]);
                }
                const oProductFilter = this.byId("scheduleProductFilter");
                if (oProductFilter) {
                    oProductFilter.setSelectedKeys([]);
                }
                const oPayrollClassificationFilter = this.byId("schedulePayrollClassificationFilter");
                if (oPayrollClassificationFilter) {
                    oPayrollClassificationFilter.setSelectedKeys([]);
                }

                // Clear all overview multi combo box selections
                const oOverviewPayeeFilter = this.byId("overviewPayeeFilter");
                if (oOverviewPayeeFilter) {
                    oOverviewPayeeFilter.setSelectedKeys([]);
                }
                const oOverviewProductFilter = this.byId("overviewProductFilter");
                if (oOverviewProductFilter) {
                    oOverviewProductFilter.setSelectedKeys([]);
                }
                const oOverviewPayrollClassificationFilter = this.byId("overviewPayrollClassificationFilter");
                if (oOverviewPayrollClassificationFilter) {
                    oOverviewPayrollClassificationFilter.setSelectedKeys([]);
                }

                MessageToast.show(`Amortization executed successfully: ${aSchedule.length} schedule entries and ${aOverview.length} overview records`);

            } catch (error) {
                MessageBox.error("Error parsing Excel file: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        onCloseUploadAmortizationDialog() {
            // Close dialog and clear file selection
            this._pUploadAmortizationDialog.then((oDialog) => {
                oDialog.close();
                // Clear the file uploader
                const oFileUploader = this.byId("amortizationFileUploader");
                if (oFileUploader) {
                    oFileUploader.clear();
                }
                this._oSelectedAmortizationFile = null;
            });
        },

        async onRefreshSchedule() {
            const oModel = this.getView().getModel();
            const oScheduleModel = this.getView().getModel("scheduleData");
            const oOverviewModel = this.getView().getModel("overviewData");

            // Get stored raw API data
            const aRawData = oModel.getProperty("/rawAmortizationData");
            const aUnconfiguredData = oModel.getProperty("/unconfiguredData") || [];

            if (!aRawData || aRawData.length === 0) {
                MessageBox.warning("No data to refresh. Please execute amortization first.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Get the latest setup data (from current setups model, not database)
                const oSetupsModel = this.getView().getModel("currentSetups");
                const aSetups = oSetupsModel.getData() || [];

                if (aSetups.length === 0) {
                    MessageBox.warning("No setup configuration found. Please add setup data before refreshing.");
                    BusyIndicator.hide();
                    return;
                }

                // Re-filter data by currently configured products (in case setup changed)
                const aConfiguredProductIds = aSetups.map(setup => setup.productId);
                const aFilteredData = aRawData.filter(record => 
                    aConfiguredProductIds.includes(record.PRODUCTID)
                );

                if (aFilteredData.length === 0) {
                    MessageBox.warning("No transactions match the current setup configuration.");
                    BusyIndicator.hide();
                    return;
                }

                // Recalculate amortization schedule with latest setup data
                const aSchedule = this._executeAmortizationCalculation(aFilteredData, aSetups);

                // Prepare overview data
                const aOverview = this._prepareOverviewData(aFilteredData, aSetups);

                // Update the schedule model
                oScheduleModel.setData(aSchedule);
                
                // Update the overview model
                oOverviewModel.setData(aOverview);
                
                // Reset filter state
                oModel.setProperty("/scheduleOriginal", null);
                oModel.setProperty("/overviewOriginal", null);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);

                // Extract distinct values for schedule filters
                const aDistinctPayeeIds = [...new Set(aSchedule.map(item => item.PayeeId))].filter(Boolean);
                const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayeeIds", aPayeeIdOptions);

                const aDistinctProducts = [...new Set(aSchedule.map(item => item.Product))].filter(Boolean);
                const aProductOptions = aDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/scheduleProducts", aProductOptions);

                const aDistinctPayrollClassifications = [...new Set(aSchedule.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aPayrollClassificationOptions = aDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayrollClassifications", aPayrollClassificationOptions);

                // Extract distinct values for overview filters
                const aOverviewDistinctPayeeIds = [...new Set(aOverview.map(item => item.PayeeId))].filter(Boolean);
                const aOverviewPayeeIdOptions = aOverviewDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayeeIds", aOverviewPayeeIdOptions);

                const aOverviewDistinctProducts = [...new Set(aOverview.map(item => item.Product))].filter(Boolean);
                const aOverviewProductOptions = aOverviewDistinctProducts.map(id => ({ id: id }));
                oModel.setProperty("/overviewProducts", aOverviewProductOptions);

                const aOverviewDistinctPayrollClassifications = [...new Set(aOverview.map(item => item["Payroll Classification"]))].filter(Boolean);
                const aOverviewPayrollClassificationOptions = aOverviewDistinctPayrollClassifications.map(id => ({ id: id }));
                oModel.setProperty("/overviewPayrollClassifications", aOverviewPayrollClassificationOptions);

                // Clear all schedule multi combo box selections
                const oPayeeFilter = this.byId("schedulePayeeFilter");
                if (oPayeeFilter) {
                    oPayeeFilter.setSelectedKeys([]);
                }
                const oProductFilter = this.byId("scheduleProductFilter");
                if (oProductFilter) {
                    oProductFilter.setSelectedKeys([]);
                }
                const oPayrollClassificationFilter = this.byId("schedulePayrollClassificationFilter");
                if (oPayrollClassificationFilter) {
                    oPayrollClassificationFilter.setSelectedKeys([]);
                }

                // Clear all overview multi combo box selections
                const oOverviewPayeeFilter = this.byId("overviewPayeeFilter");
                if (oOverviewPayeeFilter) {
                    oOverviewPayeeFilter.setSelectedKeys([]);
                }
                const oOverviewProductFilter = this.byId("overviewProductFilter");
                if (oOverviewProductFilter) {
                    oOverviewProductFilter.setSelectedKeys([]);
                }
                const oOverviewPayrollClassificationFilter = this.byId("overviewPayrollClassificationFilter");
                if (oOverviewPayrollClassificationFilter) {
                    oOverviewPayrollClassificationFilter.setSelectedKeys([]);
                }

                MessageToast.show(`Data refreshed successfully: ${aSchedule.length} schedule entries and ${aOverview.length} overview records`);

            } catch (error) {
                MessageBox.error("Error refreshing data: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        _executeAmortizationCalculation(aPayeeData, aSetups) {
            const aSchedule = [];

            aPayeeData.forEach((oPayeeRecord) => {
                try {
                    // Find matching setup by productId (from API: PRODUCTID)
                    const oSetup = aSetups.find(setup => setup.productId === oPayeeRecord.PRODUCTID);

                    if (!oSetup) {
                        console.warn(`No setup found for product: ${oPayeeRecord.PRODUCTID}. Skipping this record.`);
                        return;
                    }

                    // Extract values from payee record and setup
                    const payeeId = oPayeeRecord.PAYEEID || "";
                    const orderId = oPayeeRecord.ORDERID || "";
                    const product = oPayeeRecord.PRODUCTID || "";
                    const customer = oPayeeRecord.customer || "";
                    const totalIncentive = parseFloat(oPayeeRecord.VALUE) || 0;
                    const capPercent = parseFloat(oSetup.capPercent) || 100;
                    const term = parseInt(oSetup.term) || 12;
                    const payoutFreq = oSetup.amortizationFrequency || "Monthly";
                    const payrollClassification = oSetup.payrollClassification || "";

                    // Parse payment start date from setup (amortizationStartMonth)
                    let paymentStartDate;
                    if (oSetup.amortizationStartMonth) {
                        // Handle Excel date serial number or string date
                        if (typeof oSetup.amortizationStartMonth === "number") {
                            paymentStartDate = this._excelDateToJSDate(oSetup.amortizationStartMonth);
                        } else {
                            paymentStartDate = new Date(oSetup.amortizationStartMonth);
                        }
                    } else {
                        paymentStartDate = new Date();
                    }

                    // Check payroll classification and apply appropriate logic
                    if (payrollClassification === "Non-Deferred") {
                        // Non-Deferred: Single payment, ignore term and payment frequency
                        const paymentAmount = totalIncentive * (capPercent / 100);
                        
                        aSchedule.push({
                            PayeeId: payeeId,
                            OrderId: orderId,
                            Product: product,
                            Customer: customer,
                            "Total Incentive": this._formatCurrency(paymentAmount),
                            "Cap %": capPercent,
                            Term: 0,
                            "Payment Frequency": "One-time",
                            "Payment Start Date": this._formatDate(paymentStartDate),
                            Plan: "",
                            "Data Type": "",
                            "Data Type Name": "",
                            "Account Type": "",
                            "Payroll Classification": payrollClassification,
                            Notes: "Non-Deferred Payment"
                        });
                    } else {
                        // Deferred: Use existing logic with term and payment frequency
                        // Map frequency to months
                        const freqMonths = {
                            "Monthly": 1,
                            "Quarterly": 3,
                            "Annually": 12
                        }[payoutFreq] || 1;

                        // Calculate periods and payment amount
                        const periods = Math.floor(term / freqMonths);
                        const cappedTotal = totalIncentive * (capPercent / 100);
                        const paymentAmount = cappedTotal / periods;

                        // Generate schedule entries for this payee
                        let currentDate = new Date(paymentStartDate);
                        
                        for (let i = 1; i <= periods; i++) {
                            aSchedule.push({
                                PayeeId: payeeId,
                                OrderId: orderId,
                                Product: product,
                                Customer: customer,
                                "Total Incentive": this._formatCurrency(paymentAmount),
                                "Cap %": capPercent,
                                Term: term,
                                "Payment Frequency": payoutFreq,
                                "Payment Start Date": this._formatDate(currentDate),
                                Plan: "",
                                "Data Type": "",
                                "Data Type Name": "",
                                "Account Type": "",
                                "Payroll Classification": payrollClassification,
                                Notes: `Installment ${i} of ${periods}`
                            });
                            
                            // Add months to current date for next period
                            currentDate = this._addMonths(currentDate, freqMonths);
                        }
                    }
                } catch (error) {
                    console.error("Error calculating amortization for payee record:", oPayeeRecord, error);
                }
            });

            return aSchedule;
        },

        _prepareOverviewData(aPayeeData, aSetups) {
            const aOverview = [];

            aPayeeData.forEach((oPayeeRecord) => {
                try {
                    // Find matching setup by productId
                    const oSetup = aSetups.find(setup => setup.productId === oPayeeRecord.PRODUCTID);

                    if (!oSetup) {
                        console.warn(`No setup found for product: ${oPayeeRecord.PRODUCTID}. Skipping this record.`);
                        return;
                    }

                    // Parse payment start date from setup (amortizationStartMonth)
                    let paymentStartDate;
                    if (oSetup.amortizationStartMonth) {
                        if (typeof oSetup.amortizationStartMonth === "number") {
                            paymentStartDate = this._excelDateToJSDate(oSetup.amortizationStartMonth);
                        } else {
                            paymentStartDate = new Date(oSetup.amortizationStartMonth);
                        }
                    } else {
                        paymentStartDate = new Date();
                    }

                    // Create overview record with combined data
                    aOverview.push({
                        PayeeId: oPayeeRecord.PAYEEID || "",
                        OrderId: oPayeeRecord.ORDERID || "",
                        Product: oPayeeRecord.PRODUCTID || "",
                        Customer: oPayeeRecord.customer || "",
                        "Total Incentive": this._formatCurrency(oPayeeRecord.VALUE || 0),
                        "Cap %": parseFloat(oSetup.capPercent) || 100,
                        Term: parseInt(oSetup.term) || 12,
                        "Payment Frequency": oSetup.amortizationFrequency || "Monthly",
                        "Payment Start Date": this._formatDate(paymentStartDate),
                        Plan: "",
                        "Data Type": "",
                        "Data Type Name": "",
                        "Account Type": "",
                        "Payroll Classification": oSetup.payrollClassification || "",
                        "Expense Start Date": "",
                        "Expense End Date": "",
                        Notes: ""
                    });
                } catch (error) {
                    console.error("Error preparing overview for payee record:", oPayeeRecord, error);
                }
            });

            return aOverview;
        },

        onSchedulePayeeFilterChange(oEvent) {
            this._applyScheduleFilters();
        },

        onScheduleProductFilterChange(oEvent) {
            this._applyScheduleFilters();
        },

        onSchedulePayrollClassificationFilterChange(oEvent) {
            this._applyScheduleFilters();
        },

        _applyScheduleFilters() {
            const oModel = this.getView().getModel();
            const oScheduleModel = this.getView().getModel("scheduleData");
            
            // Get original schedule data
            const aOriginalSchedule = oModel.getProperty("/scheduleOriginal") || oScheduleModel.getData();
            
            // Store original schedule if not already stored
            if (!oModel.getProperty("/scheduleOriginal")) {
                oModel.setProperty("/scheduleOriginal", [...aOriginalSchedule]);
            }
            
            // Get selected filter values
            const oPayeeFilter = this.byId("schedulePayeeFilter");
            const oProductFilter = this.byId("scheduleProductFilter");
            const oPayrollClassificationFilter = this.byId("schedulePayrollClassificationFilter");
            
            const aSelectedPayeeIds = oPayeeFilter ? oPayeeFilter.getSelectedKeys() : [];
            const aSelectedProducts = oProductFilter ? oProductFilter.getSelectedKeys() : [];
            const aSelectedPayrollClassifications = oPayrollClassificationFilter ? oPayrollClassificationFilter.getSelectedKeys() : [];
            
            // Check if any filter is active
            const bHasActiveFilters = (aSelectedPayeeIds && aSelectedPayeeIds.length > 0) ||
                                      (aSelectedProducts && aSelectedProducts.length > 0) ||
                                      (aSelectedPayrollClassifications && aSelectedPayrollClassifications.length > 0);
            
            if (!bHasActiveFilters) {
                // No filters active, show all data
                oScheduleModel.setData([...aOriginalSchedule]);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);
            } else {
                // Apply all active filters
                let aFilteredSchedule = [...aOriginalSchedule];
                
                // Filter by Payee ID if selected
                if (aSelectedPayeeIds && aSelectedPayeeIds.length > 0) {
                    aFilteredSchedule = aFilteredSchedule.filter(item => 
                        aSelectedPayeeIds.includes(item.PayeeId)
                    );
                }
                
                // Filter by Product if selected
                if (aSelectedProducts && aSelectedProducts.length > 0) {
                    aFilteredSchedule = aFilteredSchedule.filter(item => 
                        aSelectedProducts.includes(item.Product)
                    );
                }
                
                // Filter by Payroll Classification if selected
                if (aSelectedPayrollClassifications && aSelectedPayrollClassifications.length > 0) {
                    aFilteredSchedule = aFilteredSchedule.filter(item => 
                        aSelectedPayrollClassifications.includes(item["Payroll Classification"])
                    );
                }
                
                oScheduleModel.setData(aFilteredSchedule);
                oModel.setProperty("/isFiltered", true);
                
                // Build filter description
                const aFilterParts = [];
                if (aSelectedPayeeIds && aSelectedPayeeIds.length > 0) {
                    aFilterParts.push(`Payee: ${aSelectedPayeeIds.join(", ")}`);
                }
                if (aSelectedProducts && aSelectedProducts.length > 0) {
                    aFilterParts.push(`Product: ${aSelectedProducts.join(", ")}`);
                }
                if (aSelectedPayrollClassifications && aSelectedPayrollClassifications.length > 0) {
                    aFilterParts.push(`Classification: ${aSelectedPayrollClassifications.join(", ")}`);
                }
                oModel.setProperty("/currentFilter", aFilterParts.join(" | "));
            }
        },

        onOverviewPayeeFilterChange(oEvent) {
            this._applyOverviewFilters();
        },

        onOverviewProductFilterChange(oEvent) {
            this._applyOverviewFilters();
        },

        onOverviewPayrollClassificationFilterChange(oEvent) {
            this._applyOverviewFilters();
        },

        _applyOverviewFilters() {
            const oModel = this.getView().getModel();
            const oOverviewModel = this.getView().getModel("overviewData");
            
            // Get original overview data
            const aOriginalOverview = oModel.getProperty("/overviewOriginal") || oOverviewModel.getData();
            
            // Store original overview if not already stored
            if (!oModel.getProperty("/overviewOriginal")) {
                oModel.setProperty("/overviewOriginal", [...aOriginalOverview]);
            }
            
            // Get selected filter values
            const oPayeeFilter = this.byId("overviewPayeeFilter");
            const oProductFilter = this.byId("overviewProductFilter");
            const oPayrollClassificationFilter = this.byId("overviewPayrollClassificationFilter");
            
            const aSelectedPayeeIds = oPayeeFilter ? oPayeeFilter.getSelectedKeys() : [];
            const aSelectedProducts = oProductFilter ? oProductFilter.getSelectedKeys() : [];
            const aSelectedPayrollClassifications = oPayrollClassificationFilter ? oPayrollClassificationFilter.getSelectedKeys() : [];
            
            // Check if any filter is active
            const bHasActiveFilters = (aSelectedPayeeIds && aSelectedPayeeIds.length > 0) ||
                                      (aSelectedProducts && aSelectedProducts.length > 0) ||
                                      (aSelectedPayrollClassifications && aSelectedPayrollClassifications.length > 0);
            
            if (!bHasActiveFilters) {
                // No filters active, show all data
                oOverviewModel.setData([...aOriginalOverview]);
            } else {
                // Apply all active filters
                let aFilteredOverview = [...aOriginalOverview];
                
                // Filter by Payee ID if selected
                if (aSelectedPayeeIds && aSelectedPayeeIds.length > 0) {
                    aFilteredOverview = aFilteredOverview.filter(item => 
                        aSelectedPayeeIds.includes(item.PayeeId)
                    );
                }
                
                // Filter by Product if selected
                if (aSelectedProducts && aSelectedProducts.length > 0) {
                    aFilteredOverview = aFilteredOverview.filter(item => 
                        aSelectedProducts.includes(item.Product)
                    );
                }
                
                // Filter by Payroll Classification if selected
                if (aSelectedPayrollClassifications && aSelectedPayrollClassifications.length > 0) {
                    aFilteredOverview = aFilteredOverview.filter(item => 
                        aSelectedPayrollClassifications.includes(item["Payroll Classification"])
                    );
                }
                
                oOverviewModel.setData(aFilteredOverview);
            }
        },
        

        async onFilterPress() {
            const oModel = this.getView().getModel();
            const aOverview = oModel.getProperty("/overview");

            if (!aOverview || aOverview.length === 0) {
                MessageBox.warning("No data available to filter");
                return;
            }

            // Extract distinct Payee IDs from overview
            const aDistinctPayeeIds = [...new Set(aOverview.map(item => item.PayeeId))].filter(Boolean);
            
            if (aDistinctPayeeIds.length === 0) {
                MessageBox.warning("No Payee IDs found in the data");
                return;
            }

            // Prepare payee IDs for the multi combo box
            const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
            oModel.setProperty("/payeeIds", aPayeeIdOptions);

            // Reset selected payee IDs
            this._aSelectedPayeeIds = [];

            // Load and open filter dialog
            if (!this._pFilterDialog) {
                this._pFilterDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.FilterDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            const oDialog = await this._pFilterDialog;

            // Reset the multi combo box selection
            const oMultiCombo = this.byId("payeeIdMultiCombo");
            if (oMultiCombo) {
                oMultiCombo.setSelectedKeys([]);
            }

            oDialog.open();
        },

        onPayeeIdSelectionChange(oEvent) {
            // Store the selected payee IDs
            const oMultiCombo = oEvent.getSource();
            const aSelectedItems = oMultiCombo.getSelectedItems();
            this._aSelectedPayeeIds = aSelectedItems.map(item => item.getKey());
        },

        onApplyFilter() {
            if (!this._aSelectedPayeeIds || this._aSelectedPayeeIds.length === 0) {
                MessageBox.warning("Please select at least one Payee ID");
                return;
            }

            const oModel = this.getView().getModel();
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aAllSchedule = oModel.getProperty("/scheduleOriginal") || oScheduleModel.getData();
            
            // Store original schedule if not already stored
            if (!oModel.getProperty("/scheduleOriginal")) {
                oModel.setProperty("/scheduleOriginal", [...aAllSchedule]);
            }

            // Filter schedule by selected Payee IDs
            const aFilteredSchedule = aAllSchedule.filter(item => 
                this._aSelectedPayeeIds.includes(item.PayeeId)
            );
            
            oScheduleModel.setData(aFilteredSchedule);
            oModel.setProperty("/isFiltered", true);
            oModel.setProperty("/currentFilter", this._aSelectedPayeeIds.join(", "));

            const sMessage = this._aSelectedPayeeIds.length === 1 
                ? `Filtered by Payee ID: ${this._aSelectedPayeeIds[0]}`
                : `Filtered by ${this._aSelectedPayeeIds.length} Payee IDs`;
            
            MessageToast.show(sMessage);
            
            this._pFilterDialog.then((oDialog) => {
                oDialog.close();
            });
        },

        onClearFilter() {
            const oModel = this.getView().getModel();
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aOriginalSchedule = oModel.getProperty("/scheduleOriginal");
            
            if (aOriginalSchedule) {
                oScheduleModel.setData([...aOriginalSchedule]);
            }
            
            oModel.setProperty("/isFiltered", false);
            oModel.setProperty("/currentFilter", null);
            this._aSelectedPayeeIds = [];

            // Reset multi combo box
            const oMultiCombo = this.byId("payeeIdMultiCombo");
            if (oMultiCombo) {
                oMultiCombo.setSelectedKeys([]);
            }

            MessageToast.show("Filter cleared");
            
            this._pFilterDialog.then((oDialog) => {
                oDialog.close();
            });
        },

        onSetupProductChange(oEvent) {
            const sSelectedProduct = oEvent.getParameter("selectedItem").getKey();
            const oModel = this.getView().getModel();
            const aOverview = oModel.getProperty("/overview");

            // Find records for the selected Product (there could be multiple payees)
            const aRecords = aOverview.filter(item => item.Product === sSelectedProduct);

            if (aRecords.length > 0) {
                // Use the first record to populate the form (or aggregate if needed)
                const oRecord = aRecords[0];
                
                // Populate the form with existing data
                oModel.setProperty("/setupForm", {
                    selectedProduct: sSelectedProduct,
                    capPercent: oRecord["Cap %"] || null,
                    paymentStartDate: this._formatDateForPicker(oRecord["Payment Start Date"])
                });
            } else {
                // Reset form if no records found
                oModel.setProperty("/setupForm", {
                    selectedProduct: sSelectedProduct,
                    capPercent: null,
                    paymentStartDate: null
                });
            }
        },

        onSaveSetup() {
            // Get form field values
            const oProductComboBox = this.byId("productComboBox");
            const oTotalIncentiveInput = this.byId("totalIncentiveInput");
            const oTermInput = this.byId("termInput");
            const oPaymentFrequencyComboBox = this.byId("paymentFrequencyComboBox");
            const oPayrollClassificationComboBox = this.byId("payrollClassificationComboBox");
            const oPlanInput = this.byId("planInput");
            const oDataTypeComboBox = this.byId("dataTypeComboBox");
            const oAccountTypeComboBox = this.byId("accountTypeComboBox");
            const oExpenseStartDatePicker = this.byId("expenseStartDatePicker");
            const oExpenseEndDatePicker = this.byId("expenseEndDatePicker");

            // Get values
            const sProduct = oProductComboBox.getSelectedKey();
            const sTotalIncentive = oTotalIncentiveInput.getValue();
            const sTerm = oTermInput.getValue();
            const sPaymentFrequency = oPaymentFrequencyComboBox.getSelectedKey();
            const sPayrollClassification = oPayrollClassificationComboBox.getSelectedKey();
            const sPlan = oPlanInput.getValue();
            const sDataType = oDataTypeComboBox.getSelectedKey();
            const sAccountType = oAccountTypeComboBox.getSelectedKey();
            const sExpenseStartDate = oExpenseStartDatePicker.getValue();
            const sExpenseEndDate = oExpenseEndDatePicker.getValue();

            // // Validate required fields
            // if (!sProduct) {
            //     MessageBox.error("Please select a Product");
            //     return;
            // }
            // // if (!sTotalIncentive) {
            // //     MessageBox.error("Please enter Total Incentive");
            // //     return;
            // // }
            // if (!sTerm) {
            //     MessageBox.error("Please enter Term");
            //     return;
            // }
            // if (!sPaymentFrequency) {
            //     MessageBox.error("Please select Payment Frequency");
            //     return;
            // }
            // if (!sPayrollClassification) {
            //     MessageBox.error("Please select Payroll Classification");
            //     return;
            // }
            // if (!sDataType) {
            //     MessageBox.error("Please select Data Type");
            //     return;
            // }
            // if (!sAccountType) {
            //     MessageBox.error("Please select Account Type");
            //     return;
            // }
            // if (!sExpenseStartDate) {
            //     MessageBox.error("Please select Expense Start Date");
            //     return;
            // }
            // // if (!sExpenseEndDate) {
            // //     MessageBox.error("Please select Expense End Date");
            // //     return;
            // // }

            // Validate numeric values
            const fTotalIncentive = parseFloat(sTotalIncentive);
            const iTerm = parseInt(sTerm);

            if (isNaN(fTotalIncentive) || fTotalIncentive <= 0) {
                MessageBox.error("Total Incentive must be a positive number");
                return;
            }
            if (isNaN(iTerm) || iTerm <= 0) {
                MessageBox.error("Term must be a positive integer");
                return;
            }

            // Validate date range
            // if (new Date(sExpenseStartDate) >= new Date(sExpenseEndDate)) {
            //     MessageBox.error("Expense End Date must be after Expense Start Date");
            //     return;
            // }

            BusyIndicator.show(0);

            try {
                // Get OData V4 model
                const oODataModel = this.getView().getModel();

                // Prepare payload - mapping to new schema fields
                const oPayload = {
                    productId: sProduct,
                    productCategory: "", // Not in current form, set to empty
                    commissionsCategory: "", // Not in current form, set to empty
                    capPercent: 0, // Default value as it's not in the form
                    term: iTerm,
                    amortizationFrequency: sPaymentFrequency,
                    payrollClassification: sPayrollClassification,
                    amortizationStartMonth: sExpenseStartDate,
                    genericAttribute1: "",
                    genericNumber1: null,
                    genericNumber2: null,
                    genericBoolean1: false,
                    genericDate1: null
                };

                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                fetch(`${sUrl}/AmortizationSetups`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oPayload)
                })
                .then(response => {
                    BusyIndicator.hide();
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    this.rootId = data?.rootId;
                    MessageToast.show("Amortization Setup saved successfully");
                })
                .catch(error => {
                    BusyIndicator.hide();
                    MessageBox.error("Error saving Amortization Setup details:", error);
                    console.error("Error saving Amortization Setup details:", error);
                });
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error saving setup: " + error.message);
            }
        },

        async getAllPeriods() {
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri);
            try {
                fetch(`${sUrl}/CS_V_PERIODS/CS_V_PERIODS?$filter=((PERIODTYPESEQ eq 2814749767106569 or PERIODTYPESEQ eq 2814749767106563 or PERIODTYPESEQ eq 2814749767106561) and REMOVEDATE eq 2200-01-01T00:00:00.0000000Z)`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    const result = data.value || [];
                    // Process the result to add a combined date range property
                    const processedResult = result.map(item => {
                        const startDate = item.STARTDATE ? item.STARTDATE.split('T')[0] : '';
                        const endDate = item.ENDDATE ? item.ENDDATE.split('T')[0] : '';
                        return {
                            ...item,
                            PERIOD_RANGE: `${startDate} to ${endDate}`
                        };
                    });
                    this.getView().getModel("periodsData").setData(processedResult);
                })
                .catch(error => {
                    MessageBox.error("Error fetching periods: " + error.message);
                    console.error("Error fetching periods:", error);
                });
            } catch (error) {
                MessageBox.error("Error fetching periods: " + error.message);
            }
        },

        async getAllProducts() {
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri);
            try {
                fetch(`${sUrl}/V_CS_PRODUCTID/V_CS_PRODUCTID`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    const result = data.value || [];
                    this.getView().getModel("productIds").setData(result);
                })
                .catch(error => {
                    MessageBox.error("Error fetching products: " + error.message);
                    console.error("Error fetching products:", error);
                });
            } catch (error) {
                MessageBox.error("Error fetching products: " + error.message);
            }
        },

        async getActiveDataSourceMappings() {
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri
            );

            try {
                const response = await fetch(`${sUrl}/DataSourceMappings`);
                if (!response.ok) {
                    throw new Error("Failed to fetch data source mappings");
                }
                const data = await response.json();
                const aMappings = data.value || [];

                // Filter only active mappings and sort by position
                const aActiveMappings = aMappings
                    .filter(mapping => mapping.isActive)
                    .sort((a, b) => (a.position || 0) - (b.position || 0));

                // Prepare column configuration
                const aColumnConfig = aActiveMappings.map(mapping => ({
                    columnKey: mapping.columnKey,
                    columnName: mapping.customLabel || mapping.defaultLabel,
                    tableName: mapping.tableName,
                    fieldName: mapping.fieldName,
                    position: mapping.position
                }));

                const oColumnConfigModel = this.getView().getModel("columnConfig");
                oColumnConfigModel.setData(aColumnConfig);

                console.log("Active column configuration loaded:", aColumnConfig);
                
                // Build the dynamic table after columns are loaded
                this._buildDynamicSetupsTable();
            } catch (error) {
                console.error("Error fetching active data source mappings:", error);
                MessageBox.error("Failed to load column configuration: " + error.message);
            }
        },

        async _buildDynamicSetupsTable() {
            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            const oTable = this.byId("currentSetupsTable");
            
            if (!oTable || !oColumnConfig || oColumnConfig.length === 0) {
                console.warn("Cannot build dynamic table: table or column config not available");
                return;
            }

            // Ensure dropdown data is loaded before building the table
            await this._ensureDropdownDataLoaded();

            // Remove existing columns
            oTable.removeAllColumns();

            // Create columns dynamically based on configuration
            oColumnConfig.forEach(colConfig => {
                const oColumn = new Column({
                    width: "auto",
                    header: new Text({
                        text: colConfig.columnName
                    })
                });
                oTable.addColumn(oColumn);
            });

            // Bind items with factory function
            oTable.bindItems({
                path: "currentSetups>/",
                factory: this._createSetupRowFactory.bind(this)
            });

            // Populate dropdowns after table is built
            this._populateAllComboBoxes();

            console.log(`Dynamic table built with ${oColumnConfig.length} columns`);
        },

        async onRefreshSetupTable() {
            BusyIndicator.show(0);
            try {
                // Refetch current setups data
                await this.getCurrentSetups();
                
                // Ensure dropdowns are populated (data already cached)
                this._populateAllComboBoxes();
                
                MessageToast.show("Setup table refreshed successfully");
            } catch (error) {
                console.error("Error refreshing setup table:", error);
                MessageBox.error("Failed to refresh table: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        _createSetupRowFactory(sId, oContext) {
            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            const aCells = [];

            // Create cells based on column configuration
            oColumnConfig.forEach(colConfig => {
                let oControl;
                
                // Special handling for payrollClassification - hardcoded values
                if (colConfig.columnKey === "payrollClassification") {
                    oControl = new ComboBox({
                        selectedKey: `{currentSetups>${colConfig.columnKey}}`,
                        editable: "{currentSetups>editable}",
                        placeholder: `Select ${colConfig.columnName}`,
                        items: [
                            new sap.ui.core.Item({ key: "Deferred", text: "Deferred" }),
                            new sap.ui.core.Item({ key: "Non Deferred", text: "Non Deferred" })
                        ]
                    });
                } else if (colConfig.columnKey === "amortizationFrequency") {
                    // Check if this field is mapped to a table and field
                    const bIsMapped = colConfig.tableName && colConfig.fieldName;
                    
                    if (bIsMapped) {
                        // Create ComboBox for mapped fields - will be populated from data source
                        oControl = new ComboBox({
                            selectedKey: `{currentSetups>${colConfig.columnKey}}`,
                            editable: "{currentSetups>editable}",
                            placeholder: `Select ${colConfig.columnName}`
                        });
                        
                        // Store metadata for identifying the combo box
                        oControl.data("tableName", colConfig.tableName);
                        oControl.data("fieldName", colConfig.fieldName);
                        oControl.data("columnKey", colConfig.columnKey);
                    } else {
                        // Not mapped - use hardcoded values
                        oControl = new ComboBox({
                            selectedKey: `{currentSetups>${colConfig.columnKey}}`,
                            editable: "{currentSetups>editable}",
                            placeholder: `Select ${colConfig.columnName}`,
                            items: [
                                new sap.ui.core.Item({ key: "Monthly", text: "Monthly" }),
                                new sap.ui.core.Item({ key: "Quarterly", text: "Quarterly" }),
                                new sap.ui.core.Item({ key: "Annually", text: "Annually" })
                            ]
                        });
                    }
                } else {
                    // Check if this field is mapped to a table and field
                    const bIsMapped = colConfig.tableName && colConfig.fieldName;
                    
                    if (bIsMapped) {
                        // Create ComboBox for mapped fields
                        oControl = new ComboBox({
                            selectedKey: `{currentSetups>${colConfig.columnKey}}`,
                            editable: "{currentSetups>editable}",
                            placeholder: `Select ${colConfig.columnName}`
                        });
                        
                        // Store metadata for identifying the combo box
                        oControl.data("tableName", colConfig.tableName);
                        oControl.data("fieldName", colConfig.fieldName);
                        oControl.data("columnKey", colConfig.columnKey);
                    } else {
                        // Create Input for unmapped fields
                        oControl = new Input({
                            value: `{currentSetups>${colConfig.columnKey}}`,
                            editable: "{currentSetups>editable}"
                        });
                    }
                }
                
                aCells.push(oControl);
            });

            const oColumnListItem = new ColumnListItem(sId, {
                cells: aCells,
                type: "Active"
            });

            // Attach press event for row selection
            oColumnListItem.attachPress(this.onSetupRowSelect, this);

            return oColumnListItem;
        },

        async _ensureDropdownDataLoaded() {
            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            if (!oColumnConfig || oColumnConfig.length === 0) {
                return;
            }
            
            // Check if data is already cached
            const aDataToLoad = [];
            const seenKeys = new Set();
            
            oColumnConfig.forEach(colConfig => {
                if (colConfig.tableName && colConfig.fieldName) {
                    const sCacheKey = `${colConfig.tableName}_${colConfig.fieldName}`;
                    if (!seenKeys.has(sCacheKey) && !this._dropdownCache[sCacheKey]) {
                        seenKeys.add(sCacheKey);
                        aDataToLoad.push({
                            tableName: colConfig.tableName,
                            fieldName: colConfig.fieldName,
                            cacheKey: sCacheKey
                        });
                    }
                }
            });
            
            if (aDataToLoad.length === 0) {
                // All data already cached
                return;
            }
            
            // Load missing data
            await this._loadAllDropdownData();
        },

        async _loadAllDropdownData() {
            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            if (!oColumnConfig || oColumnConfig.length === 0) {
                return;
            }

            // Get all unique table/field combinations that need data
            const aDataToLoad = [];
            const seenKeys = new Set();
            
            oColumnConfig.forEach(colConfig => {
                if (colConfig.tableName && colConfig.fieldName) {
                    const sCacheKey = `${colConfig.tableName}_${colConfig.fieldName}`;
                    if (!seenKeys.has(sCacheKey) && !this._dropdownCache[sCacheKey]) {
                        seenKeys.add(sCacheKey);
                        aDataToLoad.push({
                            tableName: colConfig.tableName,
                            fieldName: colConfig.fieldName,
                            cacheKey: sCacheKey
                        });
                    }
                }
            });

            if (aDataToLoad.length === 0) {
                // All data already cached
                this._populateAllComboBoxes();
                return;
            }

            // Show busy indicator
            BusyIndicator.show(0);

            try {
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                    this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri
                );

                // Load all data in parallel
                const aPromises = aDataToLoad.map(async (config) => {
                    try {
                        const sEndpoint = `V_${config.tableName}/V_${config.tableName}`;
                        const response = await fetch(`${sUrl}/${sEndpoint}`);
                        
                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${sEndpoint}`);
                        }
                        
                        const data = await response.json();
                        const aValues = data.value || [];
                        
                        // Extract unique values from the specified field
                        const aFieldValues = [...new Set(aValues.map(item => item[config.fieldName]))].filter(Boolean);
                        
                        // Cache the field values
                        this._dropdownCache[config.cacheKey] = aFieldValues;
                        
                        console.log(`Loaded ${aFieldValues.length} values for ${config.tableName}.${config.fieldName}`);
                    } catch (error) {
                        console.error(`Error loading ${config.tableName}.${config.fieldName}:`, error);
                    }
                });

                await Promise.all(aPromises);

                // Populate all combo boxes with loaded data
                this._populateAllComboBoxes();

            } catch (error) {
                console.error("Error loading dropdown data:", error);
                MessageBox.error("Failed to load dropdown options: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        _populateAllComboBoxes() {
            const oTable = this.byId("currentSetupsTable");
            if (!oTable) {
                return;
            }

            // Get all rows in the table
            const aItems = oTable.getItems();
            
            aItems.forEach(oItem => {
                const aCells = oItem.getCells();
                aCells.forEach(oControl => {
                    if (oControl instanceof ComboBox) {
                        const sTableName = oControl.data("tableName");
                        const sFieldName = oControl.data("fieldName");
                        
                        if (sTableName && sFieldName) {
                            const sCacheKey = `${sTableName}_${sFieldName}`;
                            const aValues = this._dropdownCache[sCacheKey];
                            
                            if (aValues && aValues.length > 0) {
                                // Clear existing items
                                oControl.removeAllItems();
                                
                                // Add cached values
                                aValues.forEach(value => {
                                    oControl.addItem(new sap.ui.core.Item({
                                        key: value,
                                        text: value
                                    }));
                                });
                            }
                        }
                    }
                });
            });
        },

        async getCurrentSetups() {
            const oModel = this.getView().getModel();
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            
            BusyIndicator.show(0);
            
            try {
                const response = await fetch(`${sUrl}/AmortizationSetups`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                
                const data = await response.json();
                this.getView().getModel("currentSetups").setData(data.value || []);
                
                // Ensure dropdown data is loaded before populating combo boxes
                await this._ensureDropdownDataLoaded();
                
                // Populate combo boxes after data is loaded
                this._populateAllComboBoxes();
                
            } catch (error) {
                MessageBox.error("Error fetching current setups: " + error.message);
                console.error("Error fetching current setups:", error);
            } finally {
                BusyIndicator.hide();
            }
        },

        onCancelSetup() {
            MessageBox.confirm("Are you sure you want to clear the setup details?", {
                title: "Confirm",
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        this._clearSetupForm();
                        MessageToast.show("Form cleared");
                    }
                }
            });
        },

        _clearSetupForm() {
            // Clear all form fields
            this.byId("productComboBox").setSelectedKey("");
            this.byId("totalIncentiveInput").setValue("");
            this.byId("termInput").setValue("");
            this.byId("paymentFrequencyComboBox").setSelectedKey("");
            this.byId("payrollClassificationComboBox").setSelectedKey("");
            this.byId("planInput").setValue("");
            this.byId("dataTypeComboBox").setSelectedKey("");
            this.byId("accountTypeComboBox").setSelectedKey("");
            this.byId("expenseStartDatePicker").setValue("");
            this.byId("expenseEndDatePicker").setValue("");
        },

        onResetSetup() {
            const oModel = this.getView().getModel();
            const oSetupForm = oModel.getProperty("/setupForm");
            const sSelectedProduct = oSetupForm.selectedProduct;

            if (!sSelectedProduct) {
                return;
            }

            const aOverview = oModel.getProperty("/overview");
            const oRecord = aOverview.find(item => item.Product === sSelectedProduct);

            if (oRecord) {
                // Reset form to original data
                oModel.setProperty("/setupForm", {
                    selectedProduct: sSelectedProduct,
                    capPercent: oRecord["Cap %"] || null,
                    paymentStartDate: this._formatDateForPicker(oRecord["Payment Start Date"])
                });

                MessageToast.show("Form reset to original values");
            }
        },

        _formatDateForPicker(dateValue) {
            if (!dateValue) {
                return null;
            }

            let date;
            if (typeof dateValue === "number") {
                // Excel date serial number
                date = this._excelDateToJSDate(dateValue);
            } else {
                // String date
                date = new Date(dateValue);
            }

            // Format as yyyy-MM-dd for DatePicker
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        async onAddSetup() {
            BusyIndicator.show(0);
            
            try {
                const oColumnConfig = this.getView().getModel("columnConfig").getData();
                if (!oColumnConfig || oColumnConfig.length === 0) {
                    MessageBox.warning("Please configure data source mappings first.");
                    BusyIndicator.hide();
                    return;
                }

                // Ensure dropdown data is loaded
                await this._ensureDropdownDataLoaded();

                const currentSetups = this.getView().getModel("currentSetups").getData();
                const aSetups = currentSetups || [];

                // Create new row object with dynamic keys based on column configuration
                const oNewSetup = { editable: true };
                oColumnConfig.forEach(colConfig => {
                    oNewSetup[colConfig.columnKey] = "";
                });

                aSetups.push(oNewSetup);
                this.getView().getModel("currentSetups").setData(aSetups);
                this.getView().getModel("currentSetups").refresh();
                
                // Populate the new combo boxes
                this._populateAllComboBoxes();
                
                MessageToast.show("New setup row added");
            } catch (error) {
                MessageBox.error("Failed to add new setup: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        onSetupRowSelect(oEvent) {
            const oModel = this.getView().getModel();
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sPath = oContext.getPath();
            const iIndex = parseInt(sPath.split("/").pop());
            
            oModel.setProperty("/selectedSetupIndex", iIndex);
        },

        onEditSetup() {
            const oModel = this.getView().getModel();
            const iIndex = oModel.getProperty("/selectedSetupIndex");

            if (iIndex === undefined) {
                MessageToast.show("Please select a row to edit");
                return;
            }

            // Make the selected row editable
            oModel.setProperty(`/currentSetups/${iIndex}/editable`, true);
            MessageToast.show("Row is now editable");
        },

        async onUploadSetups() {
            // Load and open the upload setup dialog
            if (!this._pUploadSetupDialog) {
                this._pUploadSetupDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.UploadSetupDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            
            const oDialog = await this._pUploadSetupDialog;
            oDialog.open();
        },

        onSetupFileSelect(oEvent) {
            // Store the selected setup file when user selects a file
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            
            if (oFile) {
                this._oSelectedSetupFile = oFile;
            } else {
                this._oSelectedSetupFile = null;
            }
        },

        async onUploadSetupFile() {
            // Check if file is selected
            if (!this._oSelectedSetupFile) {
                MessageBox.warning("Please select a file to upload");
                return;
            }

            // Validate file type
            if (!this._oSelectedSetupFile.name.match(/\.(xlsx|xls)$/)) {
                MessageBox.error("Please upload a valid Excel file (.xlsx or .xls)");
                return;
            }

            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            const oColumnConfig = this.getView().getModel("columnConfig").getData();
            if (!oColumnConfig || oColumnConfig.length === 0) {
                MessageBox.warning("Please configure data source mappings first.");
                return;
            }

            BusyIndicator.show(0);

            try {
                // Read and parse the Excel file
                const arrayBuffer = await this._readFileAsArrayBuffer(this._oSelectedSetupFile);
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
                
                // Read first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    MessageBox.warning("The uploaded Excel file is empty");
                    BusyIndicator.hide();
                    return;
                }

                // Validate required columns based on dynamic configuration
                const requiredColumns = oColumnConfig.map(col => col.columnName);
                const firstRow = jsonData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));

                if (missingColumns.length > 0) {
                    MessageBox.error(`Missing required columns: ${missingColumns.join(", ")}`);
                    BusyIndicator.hide();
                    return;
                }

                // Map Excel data to setup format dynamically
                const aSetups = jsonData.map(row => {
                    const oSetup = { editable: false };
                    oColumnConfig.forEach(colConfig => {
                        // Get value from Excel using column name
                        let value = row[colConfig.columnName];
                        
                        // Handle date formatting if needed
                        if (colConfig.columnKey.toLowerCase().includes('date') && value) {
                            value = this._formatDateForPicker(value);
                        }
                        
                        oSetup[colConfig.columnKey] = value || "";
                    });
                    return oSetup;
                });

                // Update the current setups model
                const oCurrentSetupsModel = this.getView().getModel("currentSetups");
                oCurrentSetupsModel.setData(aSetups);

                MessageToast.show(`Successfully uploaded ${jsonData.length} setup(s)`);
                
                // Close dialog and reset
                this.onCloseUploadSetupDialog();

            } catch (error) {
                MessageBox.error("Error processing setup file: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        onCloseUploadSetupDialog() {
            // Close dialog and clear file selection
            this._pUploadSetupDialog.then((oDialog) => {
                oDialog.close();
                // Clear the file uploader
                const oFileUploader = this.byId("setupFileUploader");
                if (oFileUploader) {
                    oFileUploader.clear();
                }
                this._oSelectedSetupFile = null;
            });
        },

        onDeleteSetup(oEvent) {
            // Get the item to be deleted
            const oItem = oEvent.getParameter("listItem");
            const oContext = oItem.getBindingContext("currentSetups");
            const oSetup = oContext.getObject();
            const sProduct = oSetup.productId || oSetup.product;

            // Show confirmation dialog
            MessageBox.confirm(`Are you sure you want to delete the setup for this product: ${sProduct}?`, {
                title: "Confirm Deletion",
                onClose: async (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        BusyIndicator.show(0);

                        try {
                            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                                this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri
                            );

                            // Call backend service to delete the setup
                            const response = await fetch(`${sUrl}/deleteAmortizationSetupByProduct`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ productId: sProduct })
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            await response.json();

                            // Remove from local model
                            const oModel = this.getView().getModel("currentSetups");
                            const aSetups = oModel.getData();
                            const iIndex = aSetups.indexOf(oSetup);
                            
                            if (iIndex > -1) {
                                aSetups.splice(iIndex, 1);
                                oModel.setData(aSetups);
                                oModel.refresh();
                            }

                            // Ensure dropdowns are repopulated after deletion
                            this._populateAllComboBoxes();

                            MessageToast.show(`Setup for product "${sProduct}" deleted successfully`);
                        } catch (error) {
                            MessageBox.error(`Failed to delete setup: ${error.message}`);
                        } finally {
                            BusyIndicator.hide();
                        }
                    }
                }
            });
        },

        async onSaveSetups() {
            const oModel = this.getView().getModel("currentSetups");
            const aSetups = oModel.getData() || [];

            if (aSetups.length === 0) {
                MessageBox.warning("No setups to save");
                return;
            }

            // // Validate all rows
            // for (let i = 0; i < aSetups.length; i++) {
            //     const oSetup = aSetups[i];
            //     if (!oSetup.product) {
            //         MessageBox.error(`Row ${i + 1}: Product is required`);
            //         return;
            //     }
            //     if (!oSetup.term || isNaN(oSetup.term) || oSetup.term <= 0) {
            //         MessageBox.error(`Row ${i + 1}: Valid Term is required`);
            //         return;
            //     }
            //     if (!oSetup.paymentFrequency) {
            //         MessageBox.error(`Row ${i + 1}: Payment Frequency is required`);
            //         return;
            //     }
            //     if (!oSetup.dataType) {
            //         MessageBox.error(`Row ${i + 1}: Data Type is required`);
            //         return;
            //     }
            //     if (!oSetup.accountType) {
            //         MessageBox.error(`Row ${i + 1}: Account Type is required`);
            //         return;
            //     }
            //     if (!oSetup.payrollClassification) {
            //         MessageBox.error(`Row ${i + 1}: Payroll Classification is required`);
            //         return;
            //     }
            //     if (!oSetup.paymentStartDate) {
            //         MessageBox.error(`Row ${i + 1}: Payment Start Date is required`);
            //         return;
            //     }
            // }

            BusyIndicator.show(0);

            try {
                // Prepare data for backend - mapping to new schema fields
                const aSetupData = aSetups.map(setup => ({
                    productId: setup.productId || setup.product,
                    productCategory: setup.productCategory || "",
                    commissionsCategory: setup.commissionsCategory || "",
                    capPercent: setup.capPercent ? parseInt(setup.capPercent) : null,
                    term: setup.term ? parseInt(setup.term) : null,
                    amortizationFrequency: setup.amortizationFrequency || setup.paymentFrequency || "",
                    payrollClassification: setup.payrollClassification || "",
                    amortizationStartMonth: setup.amortizationStartMonth || setup.paymentStartDate || "",
                    genericAttribute1: setup.genericAttribute1 || "",
                    genericNumber1: setup.genericNumber1 ? parseInt(setup.genericNumber1) : null,
                    genericNumber2: setup.genericNumber2 ? parseInt(setup.genericNumber2) : null,
                    genericBoolean1: setup.genericBoolean1 || false,
                    genericDate1: setup.genericDate1 || null
                }));
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                // Call backend service
                const response = await fetch(`${sUrl}/saveAmortizationSetup`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ setupData: aSetupData })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                // Set all rows to non-editable after successful save
                const aUpdatedSetups = aSetups.map(setup => ({
                    ...setup,
                    editable: false
                }));
                oModel.setProperty("/currentSetups", aUpdatedSetups);
                oModel.setProperty("/selectedSetupIndex", undefined);

                MessageToast.show("Setups saved successfully");
                BusyIndicator.hide();
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error(`Failed to save setups: ${error.message}`);
            }
        }
    })
});