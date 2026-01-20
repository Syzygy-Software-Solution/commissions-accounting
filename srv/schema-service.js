const cds = require('@sap/cds');

module.exports = cds.service.impl(async(srv) => {
    const { AmortizationSetups, AmortizationSchedules } = srv.entities;
    const db = await cds.connect.to('db');

    srv.on('saveAmortizationSetup', async (req) => {
        console.log('saveAmortizationSetup called');
        const setupData = req.data.setupData;
        console.log('Received setup data:', JSON.stringify(setupData));
        let updatedData = [];
        try {
            await db.run(DELETE.from('sz.AmortizationSetup'));
            console.log('Existing AmortizationSetup entries deleted.');
            await db.run(INSERT.into('sz.AmortizationSetup').entries(setupData));
            console.log('New AmortizationSetup entries inserted.');
            updatedData = await db.run(SELECT.from('sz.AmortizationSetup'));

        } catch (error) {
            req.error(500, `Error saving Amortization Setup: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });

    srv.on('deleteAmortizationSetupByProduct', async (req) => {
        console.log('deleteAmortizationSetupByProduct called');
        const deletionProduct = req.data.product;
        console.log('Received setup data:', deletionProduct);
        let updatedData = [];
        try {
            await db.run(DELETE.from('sz.AmortizationSetup').where({ product: deletionProduct }));
            console.log('Existing AmortizationSetup entries deleted.');
            updatedData = await db.run(SELECT.from('sz.AmortizationSetup'));
        } catch (error) {
            req.error(500, `Error deleting Amortization Setup: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });

    srv.on('saveDataSourceMappings', async (req) => {
        console.log('saveDataSourceMappings called');
        const mappingData = req.data.mappingData;
        console.log('Received mapping data:', JSON.stringify(mappingData));
        let updatedData = [];
        try {
            // Delete all existing mappings
            await db.run(DELETE.from('sz.DataSourceMappings'));
            console.log('Existing DataSourceMappings entries deleted.');
            
            // Insert new mappings
            await db.run(INSERT.into('sz.DataSourceMappings').entries(mappingData));
            console.log('New DataSourceMappings entries inserted.');
            
            // Return updated data
            updatedData = await db.run(SELECT.from('sz.DataSourceMappings'));
        } catch (error) {
            req.error(500, `Error saving Data Source Mappings: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });
});