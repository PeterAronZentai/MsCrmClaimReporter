    $.templates({
        appTemplate: '#appTemplate'
    });


    var Lead = $data.define("Lead", {
       Id: { type: 'Guid', key: true },
       FullName: String                
    });

    var Claim = $data.define("Claim", {
       Id: { type: 'Guid', key: true },
       Title: String,
       LeadId: { type: 'Guid' }
    });

    var ClaimItem = $data.define("ClaimItem", {
       Id: { type: 'Guid', key: true },
       Title: String,
       Amount: Number
    });

    var Attachment = $data.define("ClaimItem", {
       Id: { type: 'Guid', key: true },
       DocumentBody: String,
       TextMessage: String
    });

    var LocalClaimStore = $data.EntityContext.extend("LocalClaimStore", {
       Leads: { type: $data.EntitySet, elementType: Lead }, 
       Claim: { type: $data.EntitySet, elementType: Claim },
       ClaimItems: { type: $data.EntitySet, elementType: Lead },
       Attachments: { type: $data.EntitySet, elementType: Lead } 
    });

    
    //var l

    var app = {
        
        /* model data*/
        leads: [],
        selectedLead: undefined,
        expenseClaim: undefined,
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
            var claim = new Crm.new_expenseclaim({
                new_expenseclaimId : $data.createGuid(),
                new_claimitems: [{ new_expenseclaimitemId: $data.createGuid() }]
            });
            
            $.observable(app).setProperty("expenseClaim", claim);
            app.UI.refreshClaimItemsForm();
        },

        addClaimItem: function () {
            var claimItems = app.expenseClaim.new_claimitems;
            var claimItem = new Crm.new_expenseclaimitem({ new_expenseclaimitemId: $data.createGuid() });
            $.observable(claimItems).insert(claimItems.length, claimItem);
            app.UI.refreshClaimItemsForm();
        },

        removeClaimItem: function(index) {
            $.observable(app.expenseClaim.new_claimitems).remove(index);
        },
        
        submitClaim: function () {

            $.mobile.loading('show', { text: 'Submitting', textVisible: true, theme: "a" });
            app.dataContext.add(app.expenseClaim);

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
            },
            
            selectLead: function() {
                app.selectLead($.view(this).data); 
            },
            
            showClaimControls: function() { 
               $('#loginControls').hide();
               $('#claimControls').show();
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
