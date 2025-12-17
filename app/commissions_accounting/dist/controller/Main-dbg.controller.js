sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment"
], (Controller, JSONModel, MessageToast, MessageBox, BusyIndicator, Fragment) => {
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

            await this.getCurrentSetups();
            
            // Load SheetJS library asynchronously
            this._loadSheetJS();
            
            // Initialize selected file reference
            this._oSelectedFile = null;
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
                        "Bi-Monthly": 2,
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

            BusyIndicator.show(0);

            try {
                // Create template data with column headers from CurrentSetups table
                const aTemplateData = [
                    {
                        "Product": "",
                        "Cap %": "",
                        "Term": "",
                        "Payment Frequency": "",
                        "Payroll Classification": "",
                        "Payment Start Date": ""
                    }
                ];

                // Create worksheet
                const ws = XLSX.utils.json_to_sheet(aTemplateData);

                // Set column widths
                ws['!cols'] = [
                    { wch: 15 },  // Product
                    { wch: 10 },  // Cap %
                    { wch: 10 },  // Term
                    { wch: 20 },  // Payment Frequency
                    { wch: 25 },  // Payroll Classification
                    { wch: 20 }   // Payment Start Date
                ];

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
                // Hardcoded payee data
                const aPayeeData = [
                    {
                        "payeeId": "EMP-101",
                        "orderId": "1000234",
                        "product": "Cloud",
                        "totalIncentive": 12000
                    },
                    {
                        "payeeId": "EMP-101",
                        "orderId": "1000234",
                        "product": "On-Prem",
                        "totalIncentive": 12000
                    },
                    {
                        "payeeId": "EMP-101",
                        "orderId": "1000235",
                        "product": "Cloud",
                        "totalIncentive": 10000
                    },
                    {
                        "payeeId": "EMP-101",
                        "orderId": "1000235",
                        "product": "Cloud",
                        "totalIncentive": 10000
                    }
                ];

                // Get current setups
                const oSetupsModel = this.getView().getModel("currentSetups");
                const aSetups = oSetupsModel.getData() || [];

                if (aSetups.length === 0) {
                    MessageBox.warning("No setup data available. Please add setup configurations first.");
                    BusyIndicator.hide();
                    return;
                }

                // Calculate amortization schedule
                const aSchedule = this._executeAmortizationCalculation(aPayeeData, aSetups);

                // Prepare overview data by combining payee data with setup details
                const aOverview = this._prepareOverviewData(aPayeeData, aSetups);

                // Update the schedule model
                const oScheduleModel = this.getView().getModel("scheduleData");
                oScheduleModel.setData(aSchedule);
                
                // Update the overview model
                const oOverviewModel = this.getView().getModel("overviewData");
                oOverviewModel.setData(aOverview);
                
                const oModel = this.getView().getModel();
                oModel.setProperty("/scheduleOriginal", null);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);

                // Extract distinct Payee IDs for filter
                const aDistinctPayeeIds = [...new Set(aSchedule.map(item => item.PayeeId))].filter(Boolean);
                const aPayeeIdOptions = aDistinctPayeeIds.map(id => ({ id: id }));
                oModel.setProperty("/schedulePayeeIds", aPayeeIdOptions);

                // Clear the multi combo box selection
                const oMultiCombo = this.byId("schedulePayeeFilter");
                if (oMultiCombo) {
                    oMultiCombo.setSelectedKeys([]);
                }

                MessageToast.show(`Amortization executed successfully: ${aSchedule.length} schedule entries and ${aOverview.length} overview records`);

            } catch (error) {
                MessageBox.error("Error executing amortization: " + error.message);
            } finally {
                BusyIndicator.hide();
            }
        },

        _executeAmortizationCalculation(aPayeeData, aSetups) {
            const aSchedule = [];

            aPayeeData.forEach((oPayeeRecord) => {
                try {
                    // Find matching setup by product
                    const oSetup = aSetups.find(setup => setup.product === oPayeeRecord.product);

                    if (!oSetup) {
                        console.warn(`No setup found for product: ${oPayeeRecord.product}. Skipping this record.`);
                        return;
                    }

                    // Extract values from payee record and setup
                    const payeeId = oPayeeRecord.payeeId || "";
                    const orderId = oPayeeRecord.orderId || "";
                    const product = oPayeeRecord.product || "";
                    const totalIncentive = parseFloat(oPayeeRecord.totalIncentive) || 0;
                    const capPercent = parseFloat(oSetup.capPercent) || 100;
                    const term = parseInt(oSetup.term) || 12;
                    const payoutFreq = oSetup.paymentFrequency || "Monthly";
                    const payrollClassification = oSetup.payrollClassification || "";

                    // Parse payment start date
                    let paymentStartDate;
                    if (oSetup.paymentStartDate) {
                        // Handle Excel date serial number or string date
                        if (typeof oSetup.paymentStartDate === "number") {
                            paymentStartDate = this._excelDateToJSDate(oSetup.paymentStartDate);
                        } else {
                            paymentStartDate = new Date(oSetup.paymentStartDate);
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
                            "Bi-Monthly": 2,
                            "Semi-Annually": 6,
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
                                "Total Incentive": this._formatCurrency(paymentAmount),
                                "Cap %": capPercent,
                                Term: term,
                                "Payment Frequency": payoutFreq,
                                "Payment Start Date": this._formatDate(paymentStartDate),
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
                    // Find matching setup by product
                    const oSetup = aSetups.find(setup => setup.product === oPayeeRecord.product);

                    if (!oSetup) {
                        console.warn(`No setup found for product: ${oPayeeRecord.product}. Skipping this record.`);
                        return;
                    }

                    // Parse payment start date
                    let paymentStartDate;
                    if (oSetup.paymentStartDate) {
                        if (typeof oSetup.paymentStartDate === "number") {
                            paymentStartDate = this._excelDateToJSDate(oSetup.paymentStartDate);
                        } else {
                            paymentStartDate = new Date(oSetup.paymentStartDate);
                        }
                    } else {
                        paymentStartDate = new Date();
                    }

                    // Create overview record with combined data
                    aOverview.push({
                        PayeeId: oPayeeRecord.payeeId || "",
                        OrderId: oPayeeRecord.orderId || "",
                        Product: oPayeeRecord.product || "",
                        "Total Incentive": this._formatCurrency(oPayeeRecord.totalIncentive || 0),
                        "Cap %": parseFloat(oSetup.capPercent) || 100,
                        Term: parseInt(oSetup.term) || 12,
                        "Payment Frequency": oSetup.paymentFrequency || "Monthly",
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
            const oMultiComboBox = oEvent.getSource();
            const aSelectedKeys = oMultiComboBox.getSelectedKeys();
            const oModel = this.getView().getModel();
            const oScheduleModel = this.getView().getModel("scheduleData");
            
            // Get original schedule data
            const aOriginalSchedule = oModel.getProperty("/scheduleOriginal") || oScheduleModel.getData();
            
            // Store original schedule if not already stored
            if (!oModel.getProperty("/scheduleOriginal")) {
                oModel.setProperty("/scheduleOriginal", [...aOriginalSchedule]);
            }
            
            // If no selection, show all data
            if (!aSelectedKeys || aSelectedKeys.length === 0) {
                oScheduleModel.setData([...aOriginalSchedule]);
                oModel.setProperty("/isFiltered", false);
                oModel.setProperty("/currentFilter", null);
            } else {
                // Filter schedule by selected Payee IDs
                const aFilteredSchedule = aOriginalSchedule.filter(item => 
                    aSelectedKeys.includes(item.PayeeId)
                );
                
                oScheduleModel.setData(aFilteredSchedule);
                oModel.setProperty("/isFiltered", true);
                oModel.setProperty("/currentFilter", aSelectedKeys.join(", "));
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

                // Prepare payload
                const oPayload = {
                    product: sProduct,
                    // incentiveAmount: fTotalIncentive,
                    capPercent: 0, // Default value as it's not in the form
                    term: iTerm,
                    paymentFrequency: sPaymentFrequency,
                    dataType: sDataType,
                    accountType: sAccountType,
                    plan: sPlan || "",
                    payrollClassification: sPayrollClassification,
                    paymentStartDate: sExpenseStartDate
                    // paymentEndDate: sExpenseEndDate
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

        async getCurrentSetups() {
            const oModel = this.getView().getModel();
            const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            try {
                fetch(`${sUrl}/AmortizationSetups`, {
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
                    this.getView().getModel("currentSetups").setData(data.value || []);
                })
                .catch(error => {
                    MessageBox.error("Error fetching current setups: " + error.message);
                    console.error("Error fetching current setups:", error);
                });
            } catch (error) {
                MessageBox.error("Error fetching current setups: " + error.message);
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

        onAddSetup() {
            const currentSetups = this.getView().getModel("currentSetups").getData();
            const aSetups = currentSetups || [];

            // Add a new editable row
            const oNewSetup = {
                product: "",
                capPercent: null,
                term: null,
                paymentFrequency: "",
                dataType: "",
                accountType: "",
                plan: "",
                payrollClassification: "",
                paymentStartDate: null,
                editable: true
            };

            aSetups.push(oNewSetup);
            this.getView().getModel("currentSetups").setData(aSetups);
            this.getView().getModel("currentSetups").refresh();
            MessageToast.show("New setup row added");
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

                // Validate required columns
                const requiredColumns = ["Product", "Cap %", "Term", "Payment Frequency", "Payroll Classification", "Payment Start Date"];
                const firstRow = jsonData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));

                if (missingColumns.length > 0) {
                    MessageBox.error(`Missing required columns: ${missingColumns.join(", ")}`);
                    BusyIndicator.hide();
                    return;
                }

                // Map Excel data to setup format
                const aSetups = jsonData.map(row => ({
                    product: row["Product"],
                    capPercent: row["Cap %"],
                    term: row["Term"],
                    paymentFrequency: row["Payment Frequency"],
                    payrollClassification: row["Payroll Classification"],
                    paymentStartDate: this._formatDateForPicker(row["Payment Start Date"]),
                    editable: false
                }));

                // Prepare data for backend
                const aSetupData = aSetups.map(setup => ({
                    product: setup.product,
                    capPercent: setup.capPercent ? parseInt(setup.capPercent) : null,
                    term: parseInt(setup.term),
                    paymentFrequency: setup.paymentFrequency,
                    dataType: "",
                    accountType: "",
                    plan: null,
                    payrollClassification: setup.payrollClassification,
                    paymentStartDate: setup.paymentStartDate
                }));

                const sUrl = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                
                // Call backend service to save all setups
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

                await response.json();

                MessageToast.show(`Successfully uploaded and saved ${jsonData.length} setup(s)`);
                
                // Refresh the current setups table
                await this.getCurrentSetups();

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
            const sProduct = oSetup.product;

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
                                body: JSON.stringify({ product: sProduct })
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
                // Prepare data for backend
                const aSetupData = aSetups.map(setup => ({
                    product: setup.product,
                    capPercent: setup.capPercent ? parseInt(setup.capPercent) : null,
                    term: parseInt(setup.term),
                    paymentFrequency: setup.paymentFrequency,
                    dataType: setup.dataType,
                    accountType: setup.accountType,
                    plan: setup.plan || null,
                    payrollClassification: setup.payrollClassification,
                    paymentStartDate: setup.paymentStartDate
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