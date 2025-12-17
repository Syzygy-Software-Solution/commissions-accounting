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
            await db.run(DELETE.from('db.AmortizationSetup'));
            console.log('Existing AmortizationSetup entries deleted.');
            await db.run(INSERT.into('db.AmortizationSetup').entries(setupData));
            console.log('New AmortizationSetup entries inserted.');
            updatedData = await db.run(SELECT.from('db.AmortizationSetup'));

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
            await db.run(DELETE.from('db.AmortizationSetup').where({ product: deletionProduct }));
            console.log('Existing AmortizationSetup entries deleted.');
            updatedData = await db.run(SELECT.from('db.AmortizationSetup'));
        } catch (error) {
            req.error(500, `Error deleting Amortization Setup: ${error.message}`);
        }
        return JSON.stringify(updatedData);
    });
});