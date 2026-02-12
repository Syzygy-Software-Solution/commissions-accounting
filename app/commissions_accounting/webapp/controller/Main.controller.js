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

            // Summary section models
            var oSummaryModel = new JSONModel([]);
            this.getView().setModel(oSummaryModel, "summaryData");

            var oSummaryTotalsModel = new JSONModel({ totalAmount: "$0.00" });
            this.getView().setModel(oSummaryTotalsModel, "summaryTotals");

            var oSummaryColumnsModel = new JSONModel({
                showPayeeId: true,
                showOrderId: true,
                showCustomer: true,
                showProduct: true,
                showCapPercent: true,
                showTerm: true,
                showFrequency: true,
                showPayrollClassification: true,
                showRecordCount: true
            });
            this.getView().setModel(oSummaryColumnsModel, "summaryColumns");

            // Chart section models
            var oChartDataModel = new JSONModel([]);
            this.getView().setModel(oChartDataModel, "chartData");

            var oChartConfigModel = new JSONModel({
                chartType: "column",
                dimension: "PayeeId",
                measure: "Amount",
                topN: "10"
            });
            this.getView().setModel(oChartConfigModel, "chartConfig");

            // Messages model for message button
            var oMessagesModel = new JSONModel({
                messages: [],
                count: 0
            });
            this.getView().setModel(oMessagesModel, "messages");

            // Greeting model for header
            var oGreetingModel = new JSONModel({
                message: ""
            });
            this.getView().setModel(oGreetingModel, "greeting");

            // Code editor model
            var oCodeEditorModel = new JSONModel({
                language: "javascript",
                code: ""
            });
            this.getView().setModel(oCodeEditorModel, "codeEditor");

            // Formula generator model
            var oFormulaGeneratorModel = new JSONModel({
                prompt: "",
                generatedFormula: "",
                status: "",
                testResults: [],
                testScenario: "",
                formulaResult: ""
            });
            this.getView().setModel(oFormulaGeneratorModel, "formulaGenerator");

            // Set dynamic greeting
            this._setGreeting();

            // Load default formula into code editor
            this._loadDefaultFormula();

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

            // Load SheetJS and Chart.js libraries asynchronously
            this._loadSheetJS();
            this._loadChartJS();
        },

        _loadChartJS() {
            // Load Chart.js from CDN
            if (!window.Chart) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
                script.async = true;
                script.onload = () => {
                    console.log('Chart.js loaded successfully');
                };
                script.onerror = () => {
                    console.error('Failed to load Chart.js library');
                };
                document.head.appendChild(script);
            }
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

        /**
         * Generates Excel workbook data from schedule and/or overview data
         * @param {string} sDataType - 'schedule', 'overview', or 'both'
         * @returns {Object} - Object with workbook, filename, and base64 data
         */
        _generateExcelData(sDataType) {
            const oScheduleModel = this.getView().getModel("scheduleData");
            const oOverviewModel = this.getView().getModel("overviewData");
            const aScheduleData = oScheduleModel.getData() || [];
            const aOverviewData = oOverviewModel.getData() || [];
            
            const wb = XLSX.utils.book_new();
            const currentDate = new Date().toISOString().split('T')[0];
            let filename = "";
            
            if (sDataType === "schedule" || sDataType === "both") {
                if (aScheduleData.length > 0) {
                    const wsSchedule = XLSX.utils.json_to_sheet(aScheduleData);
                    wsSchedule['!cols'] = [
                        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
                        { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
                        { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
                    ];
                    XLSX.utils.book_append_sheet(wb, wsSchedule, "Amortization Schedule");
                }
            }
            
            if (sDataType === "overview" || sDataType === "both") {
                if (aOverviewData.length > 0) {
                    const wsOverview = XLSX.utils.json_to_sheet(aOverviewData);
                    wsOverview['!cols'] = [
                        { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
                        { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 18 },
                        { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
                    ];
                    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");
                }
            }
            
            // Generate filename based on data type
            if (sDataType === "both") {
                filename = `Amortization_Data_${currentDate}.xlsx`;
            } else if (sDataType === "schedule") {
                filename = `Amortization_Schedule_${currentDate}.xlsx`;
            } else {
                filename = `Amortization_Overview_${currentDate}.xlsx`;
            }
            
            // Generate base64 data for attachment
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            
            return {
                workbook: wb,
                filename: filename,
                base64Data: wbout,
                recordCount: sDataType === "both" 
                    ? aScheduleData.length + aOverviewData.length 
                    : (sDataType === "schedule" ? aScheduleData.length : aOverviewData.length)
            };
        },

        async onSharePress() {
            const oScheduleModel = this.getView().getModel("scheduleData");
            const oOverviewModel = this.getView().getModel("overviewData");
            const aScheduleData = oScheduleModel.getData() || [];
            const aOverviewData = oOverviewModel.getData() || [];
            
            // Check if there's any data to share
            if (aScheduleData.length === 0 && aOverviewData.length === 0) {
                MessageBox.warning("No data available to share. Please execute amortization first.");
                return;
            }
            
            // Load and open the share dialog
            if (!this._pShareDialog) {
                this._pShareDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.ShareDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            
            const oDialog = await this._pShareDialog;
            
            // Set up dialog model for data availability
            const oModel = this.getView().getModel();
            oModel.setProperty("/hasScheduleData", aScheduleData.length > 0);
            oModel.setProperty("/hasOverviewData", aOverviewData.length > 0);
            oModel.setProperty("/isEmailValid", false);
            
            // Reset form fields
            const oEmailInput = this.byId("shareEmailInput");
            const oSubjectInput = this.byId("shareSubjectInput");
            const oMessageInput = this.byId("shareMessageInput");
            const oRadioGroup = this.byId("shareDataTypeGroup");
            
            if (oEmailInput) oEmailInput.setValue("");
            if (oSubjectInput) oSubjectInput.setValue("");
            if (oMessageInput) oMessageInput.setValue("");
            if (oRadioGroup) oRadioGroup.setSelectedIndex(0);
            
            oDialog.open();
        },

        onShareEmailChange(oEvent) {
            const sEmail = oEvent.getParameter("value");
            const oModel = this.getView().getModel();
            
            // Simple email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const bIsValid = emailRegex.test(sEmail);
            
            oModel.setProperty("/isEmailValid", bIsValid);
            
            // Update input value state
            const oInput = oEvent.getSource();
            if (sEmail && !bIsValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Please enter a valid email address");
            } else {
                oInput.setValueState("None");
            }
        },

        async onSendShareEmail() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }
            
            const oEmailInput = this.byId("shareEmailInput");
            const oSubjectInput = this.byId("shareSubjectInput");
            const oMessageInput = this.byId("shareMessageInput");
            const oRadioGroup = this.byId("shareDataTypeGroup");
            
            const sEmail = oEmailInput.getValue().trim();
            const sSubject = oSubjectInput.getValue().trim() || "Amortization Data Export";
            const sMessage = oMessageInput.getValue().trim() || "Please find the attached amortization data.";
            
            // Determine which data to send based on radio selection
            const iSelectedIndex = oRadioGroup.getSelectedIndex();
            let sDataType;
            switch (iSelectedIndex) {
                case 0: sDataType = "schedule"; break;
                case 1: sDataType = "overview"; break;
                case 2: sDataType = "both"; break;
                default: sDataType = "schedule";
            }
            
            BusyIndicator.show(0);
            
            try {
                // Generate Excel data using shared method
                const oExcelData = this._generateExcelData(sDataType);
                
                // Prepare email payload
                const oEmailPayload = {
                    to: sEmail,
                    subject: sSubject,
                    body: sMessage,
                    attachment: {
                        filename: oExcelData.filename,
                        content: oExcelData.base64Data,
                        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                };
                
                // Call backend service to send email
                const sServiceUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                    this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri
                );
                
                const response = await fetch(`${sServiceUrl}/sendEmail`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oEmailPayload)
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Failed to send email: ${response.status}`);
                }
                
                MessageToast.show(`Email sent successfully to ${sEmail}`);
                this.onCloseShareDialog();
                
            } catch (error) {
                console.error("Error sending email:", error);
                MessageBox.error(
                    `Failed to send email: ${error.message}\n\nPlease ensure the mail destination is configured correctly on BTP.`,
                    { title: "Email Error" }
                );
            } finally {
                BusyIndicator.hide();
            }
        },

        onCloseShareDialog() {
            this._pShareDialog.then((oDialog) => {
                oDialog.close();
            });
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
            const periodSeq = this.getView().getModel("periodsData").getData().filter(p => p.NAME === this.getView().byId("periodsComboBox").getSelectedKey())[0]?.PERIODSEQ;
            if (!periodSeq) {
                MessageBox.warning("Please select a valid period before executing amortization.");
                BusyIndicator.hide();
                return;
            }
            try {
                // Fetch payee data from API
                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(
                    this.getOwnerComponent().getManifestEntry("sap.app").dataSources.tcmp.uri
                );
                
                // const response = await fetch(`${sUrl}/SYZ_CA_AMRT_DETAIL/SYZ_CA_AMRT_DETAIL`);
                const response = await fetch(`${sUrl}/SYZ_CA_AMRT_DETAIL/SYZ_CA_AMRT_DETAIL?$filter=PERIODSEQ eq ${periodSeq}`);
                
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
                oScheduleModel.setSizeLimit(aSchedule.length);
                oScheduleModel.setData(aSchedule);
                
                // Update the overview model
                const oOverviewModel = this.getView().getModel("overviewData");
                oOverviewModel.setSizeLimit(aOverview.length);
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

                // Calculate total transactions processed for informational message
                const iTotalTransactions = aFilteredData.length;
                const iGroupedRecords = aOverview.length;
                
                let sMessage = `Amortization executed successfully: ${iTotalTransactions} transactions grouped into ${iGroupedRecords} records, ${aSchedule.length} schedule entries generated`;
                
                if (aUnconfiguredData.length > 0) {
                    const aUnconfiguredProducts = [...new Set(aUnconfiguredData.map(r => r.PRODUCTID))];
                    
                    // Add warning message to message model
                    this._addMessage({
                        type: "Warning",
                        title: "Unconfigured Products Detected",
                        subtitle: `${aUnconfiguredData.length} transaction(s) skipped`,
                        description: `The following product(s) are missing configuration: ${aUnconfiguredProducts.join(", ")}. Configure these products in the Setup section to include them in amortization calculations.`,
                        counter: aUnconfiguredData.length
                    });
                    
                    MessageToast.show(sMessage + " (Check messages for details)");
                } else {
                    // Clear any previous messages when all data is processed successfully
                    this._clearMessages();
                    MessageToast.show(sMessage);
                }

                // Auto-populate summary data
                this._populateSummaryData();

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

                // Calculate total transactions for informational message
                const iTotalTransactions = aFilteredData.length;
                const iGroupedRecords = aOverview.length;
                
                MessageToast.show(`Data refreshed successfully: ${iTotalTransactions} transactions grouped into ${iGroupedRecords} records, ${aSchedule.length} schedule entries`);

                // Auto-populate summary data
                this._populateSummaryData();

            } catch (error) {
                MessageBox.error("Error refreshing data: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Groups payee data by PAYEEID and PRODUCTID combination,
         * summing up the VALUE field for each group.
         * @param {Array} aPayeeData - Raw payee data from API
         * @returns {Array} - Grouped data with summed VALUES
         */
        _groupPayeeDataByPayeeAndProduct(aPayeeData) {
            const oGrouped = {};

            aPayeeData.forEach((oRecord) => {
                const sKey = `${oRecord.PAYEEID}|${oRecord.PRODUCTID}`;
                
                if (!oGrouped[sKey]) {
                    // Initialize group with first record's data
                    oGrouped[sKey] = {
                        PAYEEID: oRecord.PAYEEID,
                        PRODUCTID: oRecord.PRODUCTID,
                        ORDERID: oRecord.ORDERID || "", // Keep first order ID or combine as needed
                        customer: oRecord.customer || "",
                        VALUE: 0,
                        transactionCount: 0
                    };
                }
                
                // Sum up the VALUE field
                oGrouped[sKey].VALUE += parseFloat(oRecord.VALUE) || 0;
                oGrouped[sKey].transactionCount += 1;
            });

            // Convert to array and return
            return Object.values(oGrouped);
        },

        _executeAmortizationCalculation(aPayeeData, aSetups) {
            const aSchedule = [];

            // Group payee data by PAYEEID and PRODUCTID, summing up VALUES
            const aGroupedData = this._groupPayeeDataByPayeeAndProduct(aPayeeData);

            aGroupedData.forEach((oPayeeRecord) => {
                try {
                    // Find matching setup by productId (from API: PRODUCTID)
                    const oSetup = aSetups.find(setup => setup.productId === oPayeeRecord.PRODUCTID);

                    if (!oSetup) {
                        console.warn(`No setup found for product: ${oPayeeRecord.PRODUCTID}. Skipping this record.`);
                        return;
                    }

                    // Extract values from grouped payee record and setup
                    const payeeId = oPayeeRecord.PAYEEID || "";
                    const orderId = oPayeeRecord.ORDERID || "";
                    const product = oPayeeRecord.PRODUCTID || "";
                    const customer = oPayeeRecord.customer || "";
                    const totalIncentive = parseFloat(oPayeeRecord.VALUE) || 0; // This is now the summed value
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
                            Notes: oPayeeRecord.transactionCount > 1 
                                ? `Non-Deferred Payment`
                                : "Non-Deferred Payment"
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
                                Notes: oPayeeRecord.transactionCount > 1 
                                    ? `Installment ${i} of ${periods}`
                                    : `Installment ${i} of ${periods}`
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

            // Group payee data by PAYEEID and PRODUCTID, summing up VALUES
            const aGroupedData = this._groupPayeeDataByPayeeAndProduct(aPayeeData);

            aGroupedData.forEach((oPayeeRecord) => {
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

                    // Create overview record with grouped/summed data
                    aOverview.push({
                        PayeeId: oPayeeRecord.PAYEEID || "",
                        OrderId: oPayeeRecord.ORDERID || "",
                        Product: oPayeeRecord.PRODUCTID || "",
                        Customer: oPayeeRecord.customer || "",
                        "Total Incentive": this._formatCurrency(oPayeeRecord.VALUE || 0), // This is now the summed value
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
                        Notes: oPayeeRecord.transactionCount > 1 
                            ? `${oPayeeRecord.transactionCount} transactions combined`
                            : ""
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

        // ==================== Summary Section Methods ====================

        /**
         * Populates summary data automatically (called from Execute Amortization and Refresh)
         * Uses the currently selected grouping option
         */
        _populateSummaryData() {
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aScheduleData = oScheduleModel.getData() || [];

            if (aScheduleData.length === 0) {
                // Clear summary if no schedule data
                const oSummaryModel = this.getView().getModel("summaryData");
                oSummaryModel.setData([]);
                const oSummaryTotalsModel = this.getView().getModel("summaryTotals");
                oSummaryTotalsModel.setProperty("/totalAmount", "$0.00");
                return;
            }

            // Get selected grouping field (default to PayeeId)
            const oGroupBySelector = this.getView().byId("summaryGroupBySelector");
            const sGroupBy = oGroupBySelector ? (oGroupBySelector.getSelectedKey() || "PayeeId") : "PayeeId";

            // Group and aggregate data
            const oGroupedData = {};

            aScheduleData.forEach(item => {
                let sKey;
                
                switch (sGroupBy) {
                    case "PayeeId":
                        sKey = item.PayeeId || "Unknown";
                        break;
                    case "OrderId":
                        sKey = item.OrderId || "Unknown";
                        break;
                    case "Product":
                        sKey = item.Product || "Unknown";
                        break;
                    case "PayrollClassification":
                        sKey = item["Payroll Classification"] || "Unknown";
                        break;
                    default:
                        sKey = item.PayeeId || "Unknown";
                }

                if (!oGroupedData[sKey]) {
                    oGroupedData[sKey] = {
                        groupKey: sKey,
                        groupBy: sGroupBy,
                        items: [],
                        totalAmount: 0,
                        recordCount: 0
                    };
                }

                // Parse amount (remove $ and commas)
                const sAmount = item["Total Incentive"] || "0";
                const nAmount = parseFloat(String(sAmount).replace(/[$,]/g, "")) || 0;

                oGroupedData[sKey].items.push(item);
                oGroupedData[sKey].totalAmount += nAmount;
                oGroupedData[sKey].recordCount++;
            });

            // Convert grouped data to array format for table display
            const aSummaryData = Object.values(oGroupedData).map(group => {
                const oFirstItem = group.items[0];
                
                return {
                    PayeeId: sGroupBy === "PayeeId" ? group.groupKey : (group.items.length === 1 ? oFirstItem.PayeeId : "Multiple"),
                    OrderId: sGroupBy === "OrderId" ? group.groupKey : (group.items.length === 1 ? oFirstItem.OrderId : "Multiple"),
                    Customer: group.items.length === 1 ? oFirstItem.Customer : "Multiple",
                    Product: sGroupBy === "Product" ? group.groupKey : (group.items.length === 1 ? oFirstItem.Product : "Multiple"),
                    Amount: this._formatCurrency(group.totalAmount),
                    CapPercent: group.items.length === 1 ? oFirstItem["Cap %"] : "-",
                    Term: group.items.length === 1 ? oFirstItem.Term : "-",
                    Frequency: group.items.length === 1 ? oFirstItem["Payment Frequency"] : "-",
                    AmortizationStartDate: group.items.length === 1 ? oFirstItem["Payment Start Date"] : this._getDateRange(group.items),
                    PayrollClassification: sGroupBy === "PayrollClassification" ? group.groupKey : (group.items.length === 1 ? oFirstItem["Payroll Classification"] : "Multiple"),
                    EffectiveStartDate: group.items.length === 1 ? oFirstItem["Expense Start Date"] : this._getDateRange(group.items, "Expense Start Date"),
                    RecordCount: group.recordCount
                };
            });

            // Sort by group key
            aSummaryData.sort((a, b) => {
                const aKey = a[sGroupBy] || "";
                const bKey = b[sGroupBy] || "";
                return String(aKey).localeCompare(String(bKey));
            });

            // Update column visibility based on grouping
            this._updateSummaryColumnVisibility(sGroupBy);

            // Calculate grand total
            const nGrandTotal = Object.values(oGroupedData).reduce((sum, group) => sum + group.totalAmount, 0);

            // Update models
            const oSummaryModel = this.getView().getModel("summaryData");
            oSummaryModel.setData(aSummaryData);

            const oSummaryTotalsModel = this.getView().getModel("summaryTotals");
            oSummaryTotalsModel.setProperty("/totalAmount", "$" + nGrandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));

            // Update chart data (chart now works independently from summary grouping)
            this._updateChartData();
        },

        onSummaryGroupByChange(oEvent) {
            // Auto-apply when selection changes (if there's data)
            this._populateSummaryData();
        },

        onApplySummaryGrouping() {
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aScheduleData = oScheduleModel.getData() || [];

            if (aScheduleData.length === 0) {
                MessageBox.warning("No schedule data available. Please execute amortization first.");
                return;
            }

            this._populateSummaryData();
            MessageToast.show("Summary updated");
        },

        _updateSummaryColumnVisibility(sGroupBy) {
            const oSummaryColumnsModel = this.getView().getModel("summaryColumns");
            
            // Reset all to visible
            const oVisibility = {
                showPayeeId: true,
                showOrderId: true,
                showCustomer: true,
                showProduct: true,
                showCapPercent: true,
                showTerm: true,
                showFrequency: true,
                showPayrollClassification: true,
                showRecordCount: true
            };

            // When grouping, the grouped field is always visible as the primary identifier
            // Other identification fields may show "Multiple" if there are multiple values
            
            oSummaryColumnsModel.setData(oVisibility);
        },

        _parseDateString(sDate) {
            if (!sDate) return null;
            
            // Try parsing common date formats
            // Format: "MMM DD, YYYY" (e.g., "Jan 15, 2026")
            const oDate = new Date(sDate);
            if (!isNaN(oDate.getTime())) {
                return oDate;
            }
            
            return null;
        },

        _getDateRange(aItems, sField) {
            const sDateField = sField || "Payment Start Date";
            const aDates = aItems
                .map(item => item[sDateField])
                .filter(Boolean)
                .map(d => this._parseDateString(d))
                .filter(d => d !== null)
                .sort((a, b) => a - b);

            if (aDates.length === 0) return "-";
            if (aDates.length === 1) return this._formatDate(aDates[0]);

            const oMinDate = aDates[0];
            const oMaxDate = aDates[aDates.length - 1];

            if (oMinDate.getTime() === oMaxDate.getTime()) {
                return this._formatDate(oMinDate);
            }

            return `${this._formatDate(oMinDate)} - ${this._formatDate(oMaxDate)}`;
        },

        onClearSummaryFilters() {
            // Clear date pickers
            const oDateFrom = this.getView().byId("summaryDateFrom");
            const oDateTo = this.getView().byId("summaryDateTo");
            oDateFrom.setValue("");
            oDateTo.setValue("");

            // Reset group by selector to first option
            const oGroupBySelector = this.getView().byId("summaryGroupBySelector");
            oGroupBySelector.setSelectedKey("PayeeId");

            // Clear summary data
            const oSummaryModel = this.getView().getModel("summaryData");
            oSummaryModel.setData([]);

            const oSummaryTotalsModel = this.getView().getModel("summaryTotals");
            oSummaryTotalsModel.setProperty("/totalAmount", "$0.00");

            // Clear chart data
            const oChartDataModel = this.getView().getModel("chartData");
            oChartDataModel.setData([]);

            MessageToast.show("Summary filters cleared");
        },

        // ==================== Chart Methods ====================

        /**
         * Updates chart data based on current chart configuration and schedule data
         * Works independently of summary grouping
         */
        _updateChartData() {
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aScheduleData = oScheduleModel.getData() || [];
            
            console.log("_updateChartData called, schedule data length:", aScheduleData.length);
            
            if (aScheduleData.length === 0) {
                const oChartDataModel = this.getView().getModel("chartData");
                oChartDataModel.setData([]);
                console.log("Chart data cleared - no schedule data");
                this._destroyChart();
                return;
            }

            const oChartConfigModel = this.getView().getModel("chartConfig");
            const sChartType = oChartConfigModel.getProperty("/chartType");
            const sDimension = oChartConfigModel.getProperty("/dimension");
            const sMeasure = oChartConfigModel.getProperty("/measure");
            const sTopN = oChartConfigModel.getProperty("/topN");

            console.log("Chart config:", { sChartType, sDimension, sMeasure, sTopN });

            // Group data by the selected dimension
            const oGroupedData = {};
            
            aScheduleData.forEach(item => {
                let dimensionValue;
                
                // Get dimension value based on selected dimension
                switch (sDimension) {
                    case "PayeeId":
                        dimensionValue = item.PayeeId || "Unknown";
                        break;
                    case "Product":
                        dimensionValue = item.Product || "Unknown";
                        break;
                    case "PayrollClassification":
                        dimensionValue = item["Payroll Classification"] || "Unknown";
                        break;
                    case "OrderId":
                        dimensionValue = item.OrderId || "Unknown";
                        break;
                    default:
                        dimensionValue = item.PayeeId || "Unknown";
                }
                
                if (!oGroupedData[dimensionValue]) {
                    oGroupedData[dimensionValue] = {
                        dimension: String(dimensionValue),
                        totalAmount: 0,
                        recordCount: 0
                    };
                }
                
                // Parse amount (remove $ and commas)
                const sAmount = item["Total Incentive"] || "0";
                const nAmount = parseFloat(String(sAmount).replace(/[$,]/g, "")) || 0;
                
                oGroupedData[dimensionValue].totalAmount += nAmount;
                oGroupedData[dimensionValue].recordCount++;
            });

            // Convert to array and prepare chart data
            let aChartData = Object.values(oGroupedData).map(group => {
                let measureValue;
                
                if (sMeasure === "Amount") {
                    measureValue = group.totalAmount;
                } else if (sMeasure === "RecordCount") {
                    measureValue = group.recordCount;
                }
                
                return {
                    dimension: group.dimension,
                    value: measureValue
                };
            });

            // Sort by value descending
            aChartData.sort((a, b) => b.value - a.value);

            // Apply Top N filter
            if (sTopN !== "all") {
                const nTopN = parseInt(sTopN);
                aChartData = aChartData.slice(0, nTopN);
            }

            console.log("Chart data prepared:", aChartData.length, "items", aChartData);

            // Update chart data model
            const oChartDataModel = this.getView().getModel("chartData");
            oChartDataModel.setData(aChartData);
            
            console.log("Chart data model updated");

            // Render chart with Chart.js after DOM updates
            setTimeout(() => {
                this._renderChart(aChartData, sChartType, sDimension, sMeasure);
            }, 100);
        },

        /**
         * Destroys existing Chart.js instance
         */
        _destroyChart() {
            if (this._chartInstance) {
                this._chartInstance.destroy();
                this._chartInstance = null;
                console.log("Chart instance destroyed");
            }
        },

        /**
         * Renders chart using Chart.js
         */
        _renderChart(aChartData, sChartType, sDimension, sMeasure) {
            if (!window.Chart) {
                console.error("Chart.js library not loaded");
                MessageToast.show("Chart library is loading. Please try again in a moment.");
                return;
            }

            // Get canvas element
            const oCanvas = document.getElementById('summaryChart');
            if (!oCanvas) {
                console.error("Canvas element not found, retrying...");
                // Retry after a short delay to allow DOM to update
                setTimeout(() => {
                    this._renderChart(aChartData, sChartType, sDimension, sMeasure);
                }, 200);
                return;
            }

            console.log("Canvas element found, rendering chart...");

            // Destroy existing chart instance
            this._destroyChart();

            // Prepare data for Chart.js
            const labels = aChartData.map(item => item.dimension);
            const values = aChartData.map(item => item.value);

            // Map UI5 chart types to Chart.js types
            let chartType = sChartType;
            if (sChartType === "column") {
                chartType = "bar";
            } else if (sChartType === "donut") {
                chartType = "doughnut";
            }

            // Generate colors for the chart
            const colors = this._generateChartColors(aChartData.length);

            // Chart.js configuration
            const config = {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: sMeasure === "Amount" ? "Amount ($)" : "No. of payments",
                        data: values,
                        backgroundColor: chartType === "pie" || chartType === "doughnut" ? colors : colors[0],
                        borderColor: chartType === "pie" || chartType === "doughnut" ? colors : colors[0],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: sChartType === "bar" ? 'y' : 'x',
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const clickedIndex = activeElements[0].index;
                            const clickedLabel = labels[clickedIndex];
                            this.onChartClick(clickedLabel, sDimension, sMeasure);
                        }
                    },
                    plugins: {
                        legend: {
                            display: chartType === "pie" || chartType === "doughnut",
                            position: 'right'
                        },
                        title: {
                            display: true,
                            text: `${sMeasure} by ${sDimension}`
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    // For bar chart (horizontal), value is on x-axis; for column chart, it's on y-axis
                                    const value = sChartType === "bar" ? context.parsed.x : context.parsed.y;
                                    if (sMeasure === "Amount") {
                                        label += '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    } else {
                                        label += value;
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: chartType === "pie" || chartType === "doughnut" ? {} : 
                        sChartType === "bar" ? {
                            // For horizontal bar chart: measure on x-axis, dimension on y-axis
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        if (sMeasure === "Amount") {
                                            return '$' + value.toLocaleString();
                                        }
                                        return value;
                                    }
                                }
                            },
                            y: {
                                beginAtZero: true
                            }
                        } : {
                            // For vertical column chart: dimension on x-axis, measure on y-axis
                            x: {
                                beginAtZero: true
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        if (sMeasure === "Amount") {
                                            return '$' + value.toLocaleString();
                                        }
                                        return value;
                                    }
                                }
                            }
                        }
                }
            };

            // Create new chart instance
            this._chartInstance = new Chart(oCanvas, config);
            console.log("Chart rendered successfully");
        },

        /**
         * Generates color palette for charts
         */
        _generateChartColors(count) {
            const baseColors = [
                'rgba(54, 162, 235, 0.8)',   // Blue
                'rgba(255, 99, 132, 0.8)',   // Red
                'rgba(255, 206, 86, 0.8)',   // Yellow
                'rgba(75, 192, 192, 0.8)',   // Green
                'rgba(153, 102, 255, 0.8)',  // Purple
                'rgba(255, 159, 64, 0.8)',   // Orange
                'rgba(199, 199, 199, 0.8)',  // Grey
                'rgba(83, 102, 255, 0.8)',   // Indigo
                'rgba(255, 99, 255, 0.8)',   // Pink
                'rgba(50, 205, 50, 0.8)'     // Lime
            ];
            
            if (count <= baseColors.length) {
                return baseColors.slice(0, count);
            }
            
            // Generate more colors if needed
            const colors = [...baseColors];
            for (let i = baseColors.length; i < count; i++) {
                const hue = (i * 137.508) % 360; // Golden angle approximation
                colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
            }
            return colors;
        },

        onChartTypeChange(oEvent) {
            const sSelectedKey = oEvent.getParameter("item").getKey();
            const oChartConfigModel = this.getView().getModel("chartConfig");
            oChartConfigModel.setProperty("/chartType", sSelectedKey);
            
            // Refresh chart with new type
            this._updateChartData();
        },

        onChartDimensionChange(oEvent) {
            const sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            const oChartConfigModel = this.getView().getModel("chartConfig");
            oChartConfigModel.setProperty("/dimension", sSelectedKey);
            
            // Refresh chart data
            this._updateChartData();
        },

        onChartMeasureChange(oEvent) {
            const sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            const oChartConfigModel = this.getView().getModel("chartConfig");
            oChartConfigModel.setProperty("/measure", sSelectedKey);
            
            // Refresh chart data
            this._updateChartData();
        },

        onChartTopNChange(oEvent) {
            const sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            const oChartConfigModel = this.getView().getModel("chartConfig");
            oChartConfigModel.setProperty("/topN", sSelectedKey);
            
            // Refresh chart data
            this._updateChartData();
        },

        /**
         * Handles click event on chart elements
         * Opens a dialog showing filtered schedule data for the clicked dimension
         */
        async onChartClick(sClickedValue, sDimension, sMeasure) {
            console.log("Chart clicked:", sClickedValue, sDimension, sMeasure);
            
            // Get schedule data
            const oScheduleModel = this.getView().getModel("scheduleData");
            const aScheduleData = oScheduleModel.getData() || [];
            
            if (aScheduleData.length === 0) {
                MessageToast.show("No schedule data available");
                return;
            }
            
            // Filter data based on clicked dimension
            let aFilteredData = [];
            let sDimensionField = "";
            
            switch (sDimension) {
                case "PayeeId":
                    sDimensionField = "PayeeId";
                    aFilteredData = aScheduleData.filter(item => item.PayeeId === sClickedValue);
                    break;
                case "Product":
                    sDimensionField = "Product";
                    aFilteredData = aScheduleData.filter(item => item.Product === sClickedValue);
                    break;
                case "PayrollClassification":
                    sDimensionField = "Payroll Classification";
                    aFilteredData = aScheduleData.filter(item => item["Payroll Classification"] === sClickedValue);
                    break;
                case "OrderId":
                    sDimensionField = "OrderId";
                    aFilteredData = aScheduleData.filter(item => item.OrderId === sClickedValue);
                    break;
                default:
                    aFilteredData = aScheduleData;
            }
            
            console.log("Filtered data:", aFilteredData.length, "records");
            
            if (aFilteredData.length === 0) {
                MessageToast.show(`No records found for ${sDimension}: ${sClickedValue}`);
                return;
            }
            
            // Prepare dialog data
            const oDialogModel = new JSONModel({
                dialogTitle: `Details for ${sDimension}: ${sClickedValue}`,
                dimensionType: sDimension,
                selectedValue: sClickedValue,
                data: aFilteredData
            });
            
            this.getView().setModel(oDialogModel, "chartDetails");
            
            // Load and open dialog
            if (!this._pChartDetailsDialog) {
                this._pChartDetailsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.ChartDetailsDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            
            const oDialog = await this._pChartDetailsDialog;
            oDialog.open();
        },

        /**
         * Closes the chart details dialog
         */
        onCloseChartDetailsDialog() {
            if (this._pChartDetailsDialog) {
                this._pChartDetailsDialog.then((oDialog) => {
                    oDialog.close();
                });
            }
        },

        /**
         * Exports the filtered chart details to Excel
         */
        onExportChartDetails() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageToast.show("Excel library is loading. Please try again in a moment.");
                return;
            }
            
            const oChartDetailsModel = this.getView().getModel("chartDetails");
            const aData = oChartDetailsModel.getProperty("/data") || [];
            const sDimensionType = oChartDetailsModel.getProperty("/dimensionType");
            const sSelectedValue = oChartDetailsModel.getProperty("/selectedValue");
            
            if (aData.length === 0) {
                MessageToast.show("No data to export");
                return;
            }
            
            try {
                // Create workbook and worksheet
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(aData);
                
                // Add worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, "Filtered Data");
                
                // Generate filename
                const currentDate = new Date().toISOString().split('T')[0];
                const filename = `Chart_Details_${sDimensionType}_${sSelectedValue}_${currentDate}.xlsx`;
                
                // Download file
                XLSX.writeFile(wb, filename);
                
                MessageToast.show(`Successfully exported ${aData.length} record(s)`);
            } catch (error) {
                console.error("Error exporting chart details:", error);
                MessageBox.error("Failed to export data: " + error.message);
            }
        },

        // ==================== End Chart Methods ====================

        // ==================== End Summary Section Methods ====================
        

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
                    const result = data.value.filter(obj => obj.CREATEDBY === 'Administrator') || [];

                    // Process the result to add a combined date range property
                    const processedResult = result.map(item => {
                        const startDate = item.STARTDATE ? item.STARTDATE.split('T')[0] : '';
                        let endDate = '';
                        if (item.ENDDATE) {
                            const endDateObj = new Date(item.ENDDATE.split('T')[0]);
                            endDateObj.setDate(endDateObj.getDate() - 1);
                            endDate = endDateObj.toISOString().split('T')[0];
                        }
                        return {
                            ...item,
                            PERIOD_RANGE: `${startDate} to ${endDate}`
                        };
                    });
                    const oPeriodsModel = this.getView().getModel("periodsData");
                    oPeriodsModel.setSizeLimit(processedResult.length);
                    oPeriodsModel.setData(processedResult);
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
        },

        // ==================== Message Management Methods ====================

        /**
         * Adds a message to the messages model
         * @param {Object} oMessage - Message object with type, title, subtitle, description
         */
        _addMessage(oMessage) {
            const oMessagesModel = this.getView().getModel("messages");
            const aMessages = oMessagesModel.getProperty("/messages") || [];
            
            // Add timestamp and unique ID
            const oNewMessage = {
                id: Date.now(),
                timestamp: new Date().toLocaleString(),
                ...oMessage
            };
            
            aMessages.push(oNewMessage);
            oMessagesModel.setProperty("/messages", aMessages);
            oMessagesModel.setProperty("/count", aMessages.length);
        },

        /**
         * Clears all messages
         */
        _clearMessages() {
            const oMessagesModel = this.getView().getModel("messages");
            oMessagesModel.setProperty("/messages", []);
            oMessagesModel.setProperty("/count", 0);
        },

        /**
         * Opens the message popover
         */
        async onMessageButtonPress(oEvent) {
            const oButton = oEvent.getSource();
            
            // Load and open the message popover
            if (!this._pMessagePopover) {
                this._pMessagePopover = Fragment.load({
                    id: this.getView().getId(),
                    name: "commissionsaccounting.view.fragments.MessagePopover",
                    controller: this
                }).then((oPopover) => {
                    this.getView().addDependent(oPopover);
                    return oPopover;
                });
            }
            
            const oPopover = await this._pMessagePopover;
            oPopover.openBy(oButton);
        },

        /**
         * Dismisses a specific message
         */
        onDismissMessage(oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext("messages");
            const sPath = oContext.getPath();
            const iIndex = parseInt(sPath.split("/").pop());
            
            const oMessagesModel = this.getView().getModel("messages");
            const aMessages = oMessagesModel.getProperty("/messages");
            
            aMessages.splice(iIndex, 1);
            oMessagesModel.setProperty("/messages", aMessages);
            oMessagesModel.setProperty("/count", aMessages.length);
            
            MessageToast.show("Message dismissed");
        },

        /**
         * Clears all messages from the popover
         */
        onClearAllMessages() {
            this._clearMessages();
            MessageToast.show("All messages cleared");
        },

        /**
         * Closes the message popover
         */
        onCloseMessagePopover() {
            if (this._pMessagePopover) {
                this._pMessagePopover.then((oPopover) => {
                    oPopover.close();
                });
            }
        },

        /**
         * Sets dynamic greeting based on current time and username
         */
        _setGreeting() {
            const oGreetingModel = this.getView().getModel("greeting");
            
            // Get current hour in user's local timezone
            const currentHour = new Date().getHours();
            
            // Determine greeting based on time
            let greeting;
            if (currentHour >= 0 && currentHour < 12) {
                greeting = "Good morning";
            } else if (currentHour >= 12 && currentHour < 17) {
                greeting = "Good afternoon";
            } else {
                // 5 PM (17:00) to 11:59 PM (23:59)
                greeting = "Good evening";
            }
            
            // Get username from UserInfo API (SAP BTP)
            this._getUserInfo().then((username) => {
                const fullGreeting = `${greeting}, ${username}`;
                oGreetingModel.setProperty("/message", fullGreeting);
            }).catch(() => {
                // Fallback if user info is not available
                oGreetingModel.setProperty("/message", greeting);
            });
        },

        /**
         * Fetches user information from SAP UserInfo API
         * @returns {Promise<string>} Username
         */
        async _getUserInfo() {
            try {
                // Try to get user info from SAP UI5 UserInfo API
                const sap = window.sap;
                if (sap && sap.ushell && sap.ushell.Container) {
                    // Running in Fiori Launchpad
                    const oUserInfo = sap.ushell.Container.getService("UserInfo");
                    const sFullName = oUserInfo.getFullName();
                    const sFirstName = sFullName.split(' ')[0];
                    return sFirstName || sFullName || "User";
                }
                
                // Fallback: Try to get from backend user API
                const response = await fetch('/user-api/currentUser');
                if (response.ok) {
                    const userData = await response.json();
                    return userData.firstname || userData.name || "User";
                }
                
                // Default fallback
                return "User";
            } catch (error) {
                console.log("Could not fetch user info:", error);
                return "User";
            }
        },

        /**
         * Handles code editor language change
         */
        onCodeEditorLanguageChange(oEvent) {
            const sSelectedLanguage = oEvent.getParameter("selectedItem").getKey();
            const oCodeEditorModel = this.getView().getModel("codeEditor");
            oCodeEditorModel.setProperty("/language", sSelectedLanguage);
            MessageToast.show(`Language changed to: ${oEvent.getParameter("selectedItem").getText()}`);
        },

        /**
         * Clears the code editor content
         */
        onClearCodeEditor() {
            MessageBox.confirm("Are you sure you want to clear the code editor?", {
                title: "Confirm",
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        const oCodeEditorModel = this.getView().getModel("codeEditor");
                        oCodeEditorModel.setProperty("/code", "");
                        MessageToast.show("Code editor cleared");
                    }
                }
            });
        },

        // ==================== AI Formula Generation Methods ====================

        /**
         * Load default formula into code editor on initialization
         */
        _loadDefaultFormula() {
            const defaultFormula = `// Current Amortization Formula Logic
// This is the default calculation used in the system

// For deferred payments:
// Payment per period = Total Amount / Term
const deferredPayment = totalAmount / term;

// For non-deferred (immediate) payments:
// Payment = Total Amount (full amount upfront)
const immediatePayment = totalAmount;

// With cap percentage:
// Payment = (Total Amount * (Cap Percent / 100)) / Term
const cappedPayment = (totalAmount * (capPercent / 100)) / term;

// Variables available for custom formulas:
// - totalAmount: Total commission amount
// - capPercent: Cap percentage (0-100)
// - term: Number of payment periods
// - amortizationFrequency: 'Monthly', 'Quarterly', 'Annually', 'Biweekly'
// - payrollClassification: 'W2', '1099', 'International'`;

            const oCodeEditorModel = this.getView().getModel("codeEditor");
            oCodeEditorModel.setProperty("/code", defaultFormula);
        },

        /**
         * Handles Generate Formula button press
         * Calls AI service to generate formula from natural language prompt
         */
        async onGenerateFormulaPress() {
            const oFormulaModel = this.getView().getModel("formulaGenerator");
            const sPrompt = oFormulaModel.getProperty("/prompt");

            if (!sPrompt || sPrompt.trim().length === 0) {
                MessageToast.show("Please enter a description of what you want to calculate");
                return;
            }

            // Clear previous results
            oFormulaModel.setProperty("/generatedFormula", "");
            oFormulaModel.setProperty("/status", "Generating formula...");
            oFormulaModel.setProperty("/testResults", []);
            oFormulaModel.setProperty("/testScenario", "");
            oFormulaModel.setProperty("/formulaResult", "");

            BusyIndicator.show(0);

            try {
                // Get AI service URL from manifest or use default
                const sAiServiceUrl = this._getAiServiceUrl();
                
                const response = await fetch(sAiServiceUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: sPrompt
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Failed to generate formula");
                }

                const data = await response.json();

                if (!data.isValid) {
                    MessageBox.error(data.explanation || "Generated formula is invalid");
                    oFormulaModel.setProperty("/status", "❌ Failed");
                    return;
                }

                // Set generated formula
                oFormulaModel.setProperty("/generatedFormula", data.formula);
                oFormulaModel.setProperty("/status", "✅ Formula generated successfully");

                // Update code editor with generated formula
                const oCodeEditorModel = this.getView().getModel("codeEditor");
                oCodeEditorModel.setProperty("/code", `// AI Generated Formula\n// Prompt: ${sPrompt}\n\n${data.formula}`);
                oCodeEditorModel.setProperty("/language", "javascript");

                MessageToast.show("Formula generated! Click 'Test Formula' to see it in action.");

            } catch (error) {
                console.error("Error generating formula:", error);
                MessageBox.error(`Error generating formula: ${error.message}`);
                oFormulaModel.setProperty("/status", "❌ Error");
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Get AI service URL from environment or use default
         */
        _getAiServiceUrl() {
            // Use the destination configured in mta.yaml (ai-service-api)
            // This maps to the Python AI service running on Cloud Foundry
            const oManifest = this.getOwnerComponent().getManifestObject();
            const oDataSources = oManifest.getEntry("/sap.app/dataSources");
            
            if (oDataSources && oDataSources.aiService) {
                // In Cloud Foundry, use destination routing
                const sBaseUrl = window.location.origin;
                return sBaseUrl + oDataSources.aiService.uri;
            }
            
            // Fallback for local development
            return "http://localhost:8080/api/generate-formula";
        },

        /**
         * Handles Test Formula button press
         * Tests the generated formula with predefined sample data
         */
        onTestFormulaPress() {
            const oFormulaModel = this.getView().getModel("formulaGenerator");
            const sFormula = oFormulaModel.getProperty("/generatedFormula");

            if (!sFormula) {
                MessageToast.show("No formula to test. Please generate a formula first.");
                return;
            }

            try {
                // Predefined test data
                const testData = {
                    totalAmount: 10000,
                    capPercent: 50,
                    term: 12,
                    amortizationFrequency: "Monthly",
                    payrollClassification: "W2"
                };

                // Evaluate the formula
                const result = this._evaluateFormula(sFormula, testData);

                // Build test scenario description
                const testScenario = `Total Amount: $${testData.totalAmount.toLocaleString()} | Cap: ${testData.capPercent}% | Term: ${testData.term} months | Frequency: ${testData.amortizationFrequency} | Classification: ${testData.payrollClassification}`;
                
                oFormulaModel.setProperty("/testScenario", testScenario);
                oFormulaModel.setProperty("/formulaResult", `$${result.toFixed(2)} per period`);

                // Generate sample amortization schedule
                const aSchedule = this._generateTestSchedule(result, testData);
                oFormulaModel.setProperty("/testResults", aSchedule);

                MessageToast.show("Formula tested successfully!");

            } catch (error) {
                console.error("Error testing formula:", error);
                MessageBox.error(`Error testing formula: ${error.message}\n\nPlease ensure the formula is valid JavaScript.`);
            }
        },

        /**
         * Safely evaluate formula with given data
         */
        _evaluateFormula(sFormula, oData) {
            // Extract variables from data
            const totalAmount = oData.totalAmount;
            const capPercent = oData.capPercent;
            const term = oData.term;
            const amortizationFrequency = oData.amortizationFrequency;
            const payrollClassification = oData.payrollClassification;

            try {
                // Use Function constructor to evaluate formula in isolated scope
                // This is safer than eval() but still requires validated input
                const fn = new Function('totalAmount', 'capPercent', 'term', 'amortizationFrequency', 'payrollClassification', 
                    `"use strict"; return (${sFormula});`);
                
                const result = fn(totalAmount, capPercent, term, amortizationFrequency, payrollClassification);

                if (typeof result !== 'number' || isNaN(result)) {
                    throw new Error("Formula did not return a valid number");
                }

                return result;
            } catch (error) {
                throw new Error(`Formula evaluation failed: ${error.message}`);
            }
        },

        /**
         * Generate test amortization schedule
         */
        _generateTestSchedule(paymentAmount, testData) {
            const schedule = [];
            const startDate = new Date();
            let remainingBalance = testData.totalAmount;

            for (let i = 1; i <= Math.min(testData.term, 6); i++) {
                const periodDate = new Date(startDate);
                periodDate.setMonth(periodDate.getMonth() + i);

                const payment = Math.min(paymentAmount, remainingBalance);
                remainingBalance -= payment;

                schedule.push({
                    period: i,
                    date: periodDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    payment: `$${payment.toFixed(2)}`,
                    remaining: `$${Math.max(0, remainingBalance).toFixed(2)}`,
                    status: remainingBalance > 0 ? "Pending" : "Complete"
                });
            }

            // Add ellipsis row if more periods exist
            if (testData.term > 6) {
                schedule.push({
                    period: "...",
                    date: "...",
                    payment: "...",
                    remaining: "...",
                    status: `${testData.term - 6} more periods`
                });
            }

            return schedule;
        },

        /**
         * Handles Clear button in formula generator
         */
        onClearFormulaGenerator() {
            const oFormulaModel = this.getView().getModel("formulaGenerator");
            oFormulaModel.setProperty("/prompt", "");
            oFormulaModel.setProperty("/generatedFormula", "");
            oFormulaModel.setProperty("/status", "");
            oFormulaModel.setProperty("/testResults", []);
            oFormulaModel.setProperty("/testScenario", "");
            oFormulaModel.setProperty("/formulaResult", "");

            // Reload default formula
            this._loadDefaultFormula();

            MessageToast.show("Formula generator cleared");
        }

        // ==================== End AI Formula Generation Methods ====================

        // ==================== End Message Management Methods ====================
    })
});