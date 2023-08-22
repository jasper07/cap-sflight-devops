const { wdi5, default: _ui5Service } = require("wdio-ui5-service");
const ui5Service = new _ui5Service();
describe("FE basics", () => {
    let FioriElementsFacade
    let FioriElementsFacadeLaunchpad
    before(async () => {
        await wdi5.goTo("#travel-process")

        // for navigating back
        FioriElementsFacadeLaunchpad = await browser.fe.initialize({
            onTheShell: {
                Shell: {}
            }
        })

        await $("iframe").waitForExist()
        await browser.switchToFrame(0) //> only 1 frame in the game
        await ui5Service.injectUI5()

        FioriElementsFacade = await browser.fe.initialize({
            onTheMainPage: {
                ListReport: {
                    appId: "sap.fe.cap.travel",
                    componentId: "TravelList",
                    entitySet: "Travel"
                }
            },
            onTheDetailPage: {
                ObjectPage: {
                    appId: "sap.fe.cap.travel",
                    componentId: "TravelObjectPage",
                    entitySet: "Travel"
                }
            },
            onTheItemPage: {
                ObjectPage: {
                    appId: "sap.fe.cap.travel",
                    componentId: "BookingObjectPage",
                    entitySet: "Booking"
                }
            },
            onTheShell: {
                Shell: {}
            }
        })
    })

    it("should see the List Report page", async () => {
        await FioriElementsFacade.execute((Given, When, Then) => {
            Then.onTheMainPage.iSeeThisPage();
        })
    })

    // it("should see the Object Pages load and then returns to list", async () => {
    //     await FioriElementsFacade.execute((Given, When, Then) => {
    //         When.onTheMainPage.onTable().iPressRow(1)
    //         Then.onTheDetailPage.iSeeThisPage()

    //         When.onTheDetailPage.onTable({ property: "to_Booking" }).iPressRow({ BookingID: "1" });
    //         Then.onTheItemPage.iSeeThisPage();

    //     })

    //     await browser.switchToParentFrame()
    //     await FioriElementsFacadeLaunchpad.execute((Given, When, Then) => {

    //         When.onTheShell.iNavigateBack()
    //         When.onTheShell.iNavigateBack()

    //     })
    //     await browser.switchToFrame(0)

    //     await FioriElementsFacade.execute((Given, When, Then) => {
    //         Then.onTheMainPage.iSeeThisPage()
    //     })
    // })

    it("should create a travel request", async () => {
        let beginDate = new Date();
        let endDate = new Date(Date.now() + 6.048e+8);
        await FioriElementsFacade.execute((Given, When, Then) => {
            Then.onTheMainPage.iSeeThisPage();
            Then.onTheMainPage.onTable().iCheckAction("Create", { enabled: true });

            // Click on Create button
            When.onTheMainPage.onTable().iExecuteAction("Create");
            Then.onTheDetailPage.iSeeObjectPageInEditMode();
            When.onTheDetailPage.iGoToSection("General Information");

            // Value help Agency ID
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "TravelData" })
                .iOpenValueHelp({ property: "to_Agency_AgencyID" });
            When.onTheDetailPage
                .onValueHelpDialog()
                .iSelectRows({ 0: "070006" });

            // Value help Customer ID
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "TravelData" })
                .iOpenValueHelp({ property: "to_Customer_CustomerID" });
            When.onTheDetailPage
                .onValueHelpDialog()
                .iSelectRows({ 0: "000001" });

            // Starting date
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "DateData" })
                .iChangeField({ property: "BeginDate" }, beginDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }));

            // End date
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "DateData" })
                .iChangeField({ property: "EndDate" }, endDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }));

            // Booking fee
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "PriceData" })
                .iChangeField({ property: "BookingFee" }, "50.00");

            // Currency
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "PriceData" })
                .iChangeField({ property: "CurrencyCode_code" }, "EUR");

            // Description
            When.onTheDetailPage
                .onForm({ section: "Travel", fieldGroup: "TravelData" })
                .iChangeField({ property: "Description" }, "Travel for deletion");

            // Save all
            Then.onTheDetailPage.onFooter().iCheckDraftStateSaved();
            When.onTheDetailPage.onFooter().iExecuteSave();
            Then.onTheDetailPage.iSeeThisPage().and.iSeeObjectPageInDisplayMode();
        })

        await browser.switchToParentFrame()
        await FioriElementsFacadeLaunchpad.execute((Given, When, Then) => {
            When.onTheShell.iNavigateBack()
        })
        await browser.switchToFrame(0)

    })

    it("should delete a travel request", async () => {
        await FioriElementsFacade.execute((Given, When, Then) => {
            Then.onTheMainPage.iSeeThisPage();

            Then.onTheMainPage
                .onTable()
                .iCheckDelete({ visible: true, enabled: false });

            // select row to be deleted
            When.onTheMainPage
                .onTable()
                .iSelectRows({ "Customer": "Buchholm (000001)" });

            Then.onTheMainPage
                .onTable()
                .iCheckDelete({ visible: true, enabled: true });
            When.onTheMainPage
                .onTable()
                .iExecuteDelete();
            When.onTheMainPage.onDialog().iConfirm();
            Then.onTheMainPage
                .onTable()
                .iCheckDelete({ visible: true, enabled: false });
        })
    })

    it("should see the Object Pages load and then returns to list", async () => {
        await FioriElementsFacade.execute((Given, When, Then) => {
            When.onTheMainPage.onTable().iPressRow(1)
            Then.onTheDetailPage.iSeeThisPage()

        })

        await browser.switchToParentFrame()
        await FioriElementsFacadeLaunchpad.execute((Given, When, Then) => {

            When.onTheShell.iNavigateBack()

        })
        await browser.switchToFrame(0)

        await FioriElementsFacade.execute((Given, When, Then) => {
            Then.onTheMainPage.iSeeThisPage()
        })
    })

})