// JayData 1.3.1
(function ($data, window, undefined) {
    var odata = window.OData;

    odata.originalHttpClient = odata.defaultHttpClient;
    $data.postMessageODataHandler = {
        postMessageHttpClient: {
            targetIframe: undefined,
            request: function (request, success, error) {
                var targetIframe = request.targetIframe || $data.postMessageODataHandler.postMessageHttpClient.targetIframe;
                var targetOrigin = request.targetOrigin || $data.postMessageODataHandler.postMessageHttpClient.targetOrigin || '*';

                if (targetIframe) {
                    
                    var listener = function (event) {
                        $data.Trace.log('in listener');
                        window.removeEventListener('message', listener);
                        var statusCode = event.data.statusCode;
                        if (statusCode >= 200 && statusCode <= 299) {
                            success(event.data);
                        } else {
                            error(event.data);
                        }
                    };
                    window.addEventListener('message', listener, false);
                    $data.Trace.log('before post', targetIframe);
                    targetIframe.postMessage(request, targetOrigin);
                } else {
                    return odata.originalHttpClient.request(request, success, error);
                }
            }
        },
        requestProxy: function (request, success, error) {
            success = request.success || success;
            error = request.error || error;

            delete request.success;
            delete request.error;

            var targetIframe = request.targetIframe || $data.postMessageODataHandler.postMessageHttpClient.targetIframe;
            var targetOrigin = request.targetOrigin || $data.postMessageODataHandler.postMessageHttpClient.targetOrigin || '*';


            if (targetIframe) {
                request.requestProxy = true;
                var listener = function (event) {
                    $data.Trace.log('in listener');
                    window.removeEventListener('message', listener);
                    var statusCode = event.data.statusCode;
                    if (statusCode >= 200 && statusCode <= 299) {
                        success(event.data);
                    } else {
                        error(event.data);
                    }
                };
                window.addEventListener('message', listener, false);
                $data.Trace.log('before post', targetIframe);
                targetIframe.postMessage(request, targetOrigin);
            } else {
                error({ message: "No iframe detected", request: request, response: undefined });
            }
        }
    };
    odata.defaultHttpClient = $data.postMessageODataHandler.postMessageHttpClient;

})($data, window);

(function ($data) {
    
    function isCordovaApp() {
        return document.URL.indexOf("file://") === 0;    
    }
    
    $data.MsCrm = {
        disableBatch: true
    };


    $data.MsCrm.Auth = {
        trace: true,
        clientAuthorizationPath: "/WebResources/new_authorize2.html",
        messageHandlerPath: "/WebResources/new_postmessage.html",
        checkImagePath: "/WebResources/new_check.gif",
        loginStatus: { },
        check: function( crmUrl, cb) {
            var img = document.createElement("img");
            img.style.height = "0px";
            img.style.width = "0px";
            var tout = window.setTimeout(function () {
                cb(false);
                img.onerror = null;
                img.onload = null;
            }, 5000);

            img.onerror = function () {
                window.clearTimeout(tout);
                cb(false);
            };
            img.onload = function () {
                window.clearTimeout(tout);
                cb(true);
            };
            img.src = crmUrl + $data.MsCrm.Auth.checkImagePath;
            document.body.appendChild(img);
        },

        login: function do_login(crmUrl, cb, local) {
            var iframe, w;

            var onMessagehandlerLoaded = function (e) {
                if ($data.MsCrm.Auth.trace) console.log("Message received", crmUrl);
                if (e.data.MessageHandlerLoaded) {
                    if ($data.MsCrm.Auth.trace) console.log("Message handler loaded", crmUrl);
                    window.removeEventListener("message", onMessagehandlerLoaded);
                    window.OData.defaultHttpClient.targetIframe = iframe.contentWindow;
                    cb(iframe.contentWindow, crmUrl);
                }
            }

            var onAuthenticated = function (e) {
                console.log("authenticated rece", e);
                try { w.close(); } catch (e) { };

                iframe = document.createElement("iframe");
                if (e.data.Authenticated) {
                    console.log("Logged in to CRM: " + crmUrl);
                    window.removeEventListener("message", onAuthenticated);
                    window.addEventListener("message", onMessagehandlerLoaded);
                    var url = local ? "postmessage.html" : crmUrl + $data.MsCrm.Auth.messageHandlerPath;
                    iframe.src = url;
                    iframe.style.display = "none";
                    document.body.appendChild(iframe);
                }
            }

            var url = local ? "authorize.html" : crmUrl + $data.MsCrm.Auth.clientAuthorizationPath;

                if (!result) {
                    alert(result);
                    window.addEventListener("message", onAuthenticated);
                    w = window.open(url, "_blank", "resizable=false,location=0,menubar=0,toolbar=0,width=200,height=300");
                    w.addEventListener("loadstop", function (e) {
                        if (e.url.indexOf("https://jaydata") === 0) {
                            console.log("load stop #1");
                            window.setTimeout(function () {
                                console.log("sending self msg");
                                window.postMessage({ Authenticated: true }, '*');
                            }, 0);
                        }
                    });
                } else {
                    onAuthenticated({ data: { Authenticated: true } });
                }

        }

    }
    $data.MsCrm.init = function (crmAddress, contextType, cb) {
        var config = {};
        if (typeof crmAddress === 'object' && crmAddress) {
            config = crmAddress;
            crmAddress = config.url;
            delete config.url;
        }
        var serviceUrl = crmAddress + '/XRMServices/2011/OrganizationData.svc';

        if (window.location.href.indexOf(crmAddress) > -1) {
            initContext();
        } else {
            $data.MsCrm.Auth.login(crmAddress, function () {
                initContext();
            });
        }

        function initContext() {
            if (!(contextType.isAssignableTo && contextType.isAssignableTo($data.EntityContext))) {
                cb = contextType;
                config.disableBatch = $data.MsCrm.disableBatch;
                $data.service(serviceUrl, config, function (factory) {
                    var ctx = factory();
                    ctx.onReady().then(function () {
                        cb(ctx, factory);
                    });
                });
            } else {
                function factory() {
                    return new contextType({ name: 'oData', oDataServiceHost: serviceUrl, disableBatch: $data.MsCrm.disableBatch });
                }
                var ctx = factory();
                ctx.onReady().then(function () {
                    cb(ctx, factory);
                });
            }
        }
    }

})($data);