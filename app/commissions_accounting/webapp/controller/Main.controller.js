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
        onInit() {
            // Initialize empty model
            const oModel = new JSONModel({
                overview: [],
                schedule: [],
                setupForm: {
                    selectedProduct: null,
                    capPercent: null,
                    paymentStartDate: null
                }
            });
            this.getView().setModel(oModel);
            
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

            oModel.setProperty("/schedule", aSchedule);
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

        onDownloadSchedulePress() {
            // Check if XLSX library is loaded
            if (!window.XLSX) {
                MessageBox.error("Excel processing library is still loading. Please try again in a moment.");
                return;
            }

            const oModel = this.getView().getModel();
            const aScheduleData = oModel.getProperty("/schedule");

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
            const aAllSchedule = oModel.getProperty("/scheduleOriginal") || oModel.getProperty("/schedule");
            
            // Store original schedule if not already stored
            if (!oModel.getProperty("/scheduleOriginal")) {
                oModel.setProperty("/scheduleOriginal", [...aAllSchedule]);
            }

            // Filter schedule by selected Payee IDs
            const aFilteredSchedule = aAllSchedule.filter(item => 
                this._aSelectedPayeeIds.includes(item.PayeeId)
            );
            
            oModel.setProperty("/schedule", aFilteredSchedule);
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
            const aOriginalSchedule = oModel.getProperty("/scheduleOriginal");
            
            if (aOriginalSchedule) {
                oModel.setProperty("/schedule", [...aOriginalSchedule]);
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

            // Validate required fields
            if (!sProduct) {
                MessageBox.error("Please select a Product");
                return;
            }
            // if (!sTotalIncentive) {
            //     MessageBox.error("Please enter Total Incentive");
            //     return;
            // }
            if (!sTerm) {
                MessageBox.error("Please enter Term");
                return;
            }
            if (!sPaymentFrequency) {
                MessageBox.error("Please select Payment Frequency");
                return;
            }
            if (!sPayrollClassification) {
                MessageBox.error("Please select Payroll Classification");
                return;
            }
            if (!sDataType) {
                MessageBox.error("Please select Data Type");
                return;
            }
            if (!sAccountType) {
                MessageBox.error("Please select Account Type");
                return;
            }
            if (!sExpenseStartDate) {
                MessageBox.error("Please select Expense Start Date");
                return;
            }
            // if (!sExpenseEndDate) {
            //     MessageBox.error("Please select Expense End Date");
            //     return;
            // }

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
        }
    })
});