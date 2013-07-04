    $.templates({
        appTemplate: '#appTemplate'
    });

    var app = {
        
        /* model data*/
        leads: [],
        selectedLead: undefined,
        expenseClaim: {new_claimitems: []},
        claimItems: [],
        dataContext: null,
        claims: undefined,
        selectedClaim: undefined,
        network: 'online',
        insertedCounter: 0,
        doLogin: function () {
            console.log(this);
            app.UI.showLoading('Logging in...');
            
            $data.MsCrm.init("https://jaydata.crm.dynamics.com", Crm.DataContext, function (context) {
               
               app.dataContext = context;
               $.mobile.changePage("#claimControlsPage", { transition: 'slide'});
                
            });
        },

        selectLead: function (lead) {
            $.observable(this).setProperty("selectedLead", lead);
        },


        listLeads: function() {
            app.UI.showLoading('Loading...');
            app.dataContext
                   .LeadSet
                   //.filter(function(lead) { return lead.FullName.contains('some value') }
                   .map("{ LeadId: it.LeadId, FullName: it.FullName }",null, "default")
                   .toArray(function (leads) {
                       //$.observable(app.leads).insert(0, leads);
                       console.log("setting leads");
                       $.observable(app).setProperty("leads", leads);
                       $('#leadListControl').listview("refresh");
                       $.mobile.loading('hide');
                   })
                   .then(function () {
                   });
        },
        
        createClaim: function() {
            //the UI can operate over simple JS objects or JayData objects
            //we use simple JS objects here and later in submitClaim do we create entities
            var claim = {  new_expenseclaimId : $data.createGuid() };
            claim.new_claimitems = [];
            $.observable(app).setProperty("expenseClaim", claim);
            app.addClaimItem();
        },

        addClaimItem: function () {
            var claimItems = app.expenseClaim.new_claimitems;
            $.observable(claimItems).insert(claimItems.length, {new_expenseclaimitemId: $data.createGuid()});
            app.UI.refreshClaimItemsForm();
        },

        removeClaimItem: function(index) {
            $.observable(app.expenseClaim.new_claimitems).remove(index);
        },
        
        submitClaim: function () {


            $.mobile.loading('show', { text: 'Submitting', textVisible: true, theme: "a" });
            var expenseClaim = new Crm.new_expenseclaim(app.expenseClaim);
            debugger;
            app.dataContext.add(expenseClaim);
            //Dynamics CRM has a bit annoying naming scheme, 
            //nav properties are called the same on both ends
            //here expenseClaim.new_expenseclaims is in fact the Lead entity
            if (app.selectedLead) {
                app.dataContext.attach(app.selectedLead);
                app.expenseClaim.new_expenseclaims = app.selectedLead;
            }

            app.dataContext.saveChanges().then(function () {
                $.mobile.loading('hide');
                history.back();
            });
        },


        listClaims: function () {
            app.UI.showLoading("Getting claims");
            app.dataContext
                .new_expenseclaimSet
                .include("new_claimitems")
                .order("-CreatedOn")
                .take(10)
                .toArray(function (claims) {
                    $.observable(app).setProperty("claims", claims);
                })
                .then(function () {
                    $('#claim-list').trigger('create');
                    app.UI.hideLoading();
                });
        },
    
        pickLead: function() {
            app.selectLead($.view(this).data); 
        },
        UI: {
            refreshClaimItemsForm: function() {
                $('#claimItemsForm').trigger('create');
                $('#new-claim-form').validate({ submitHandler: app.submitClaim });
            },
            
            selectLead: function() {
                app.selectLead($.view(this).data); 
            },
            
            showLoading: function(msg) {
                $.mobile.loading('show', { text: msg, textVisible: true, theme: "a" });
            },
            hideLoading: function() {
              $.mobile.loading('hide');
            }
            
        }
    
    }

window.addEventListener("offline", function(e) {
      $.observable(app).setProperty("network", "offline");
    }, false);
    
    window.addEventListener("online", function(e) {
      $.observable(app).setProperty("network", "online");
    }, false);
    

  $.link.appTemplate('#theBody', app)
        .on('click', '#command-login', app.doLogin)
        .on('click', '#command-add-claim', app.createClaim)
        .on('click', '.select-lead', app.UI.selectLead)
        .on('click', '#add-claim-item', app.addClaimItem)
        .on('click', '.remove-claim-item', function () { app.removeClaimItem($.view(this).getIndex()); })
        .on('click', '#submit-claim', function () { app.submitClaim(); })
        .on('click','#command-add-meny', function() {
            var counter = 1000;
            function insertOne() {
                counter -= 1;
                if (counter > 0) {
                    var claim = new Crm.new_expenseclaim({
                        new_expenseclaimId : $data.createGuid(),
                        new_name: $data.createGuid().toString()
                        });
                    app.dataContext.add(claim);
                    app.dataContext.saveChanges().then(insertOne).fail($data.debug);
                    $.observable(app).setProperty("insertedCount", counter); 
                }
            }
        })
        .on('submit','#new-claim-form', function() {
            console.log("submit event");
           return false;
        })
        .on('pageshow', '#leadList', function() {
              app.listLeads();  
        })
        .on('pageshow', '#listClaims', function () {
            if (!app.claims) {
                app.listClaims();
            }
        })
        .on('pagebeforeshow', '#createClaimPage', function () {
            $('#createClaimPage').trigger('create');
        });


