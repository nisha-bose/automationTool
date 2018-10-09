var port = chrome.runtime.connect();

var app = angular.module("myApp", ['jsonFormatter']);

app.controller("myCtrl", function($scope, $http, $timeout) {

    $scope.response = [{
        "type": "textInput",
        "locator": {
            "id": "firstname",
            "name": "firstname",
            "xpath": "//*[@id='firstname']"
        },
        "auto": true,
        "enabled": false,
        "value": "orderdata.name",
        "selectedLocator": "id"
    }];
    $scope.checks = [];
    $scope.localState = {};
    $scope.currentInstructionCount = 0;
    $scope.locator = 'id';
    $scope.generator = {};
    $scope.inputs = {};
    $scope.condition = {};
    $scope.conditionFlag = false;
    $scope.conditionArray = []; //Keep track opening and closing of condition. 
    $scope.generatePageFlag = true;    
    $scope.changeLocator = function(currentInstruction, locator) {
        $scope.response[$scope.currentInstructionCount] = angular.copy($scope.currentInstruction);
        console.log(locator);
    }

    /**
     * Method to fetch api data
     *
     * @param object resume
     *
     * @return object
     *
     */
    $scope.fetchApi = function(resume) {

        $scope.condition.apiValue = "";
        $scope.condition.caseString = "";
        $scope.conditionFlag = false;

        $scope.localState = JSON.parse(localStorage.getItem('automationToolState'));
        $scope.loading = true;
        $http.get("https://atomic.incfile.com/api/webauto/misc-order/" + $scope.generator.state + "/llc?id=" + $scope.generator.order)
            .then(function(response) {
                $scope.loading = false;
                $scope.api = response.data;
                $scope.apiKeys = getNestedJsonKeys(response.data);
                $scope.generatePageFlag = false;
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: "getText",
                        elements: $scope.inputs
                    }, function(resp) {

                        if (!resume)
                            $scope.response = resp;
                        else if ($scope.localState[$scope.generator.state]) {
                            $scope.response = $scope.localState[$scope.generator.state].annualReport.instructions;
                            $scope.currentInstructionCount = $scope.localState[$scope.generator.state].annualReport.currentInstructionCount;
                        } else {
                            alert('No resume data found for ' + $scope.generator.state + '. loading from the beginning...');
                            $scope.response = resp;
                        }
                        console.log("response from Page: ", resp);
                        if (!resp || !resp.length) {
                            alert("No fields found");
                            console.error("No fields found");
                        } else {
                            $scope.currentInstruction = $scope.response[$scope.currentInstructionCount];
                            makeDefaultLocator($scope.currentInstruction);
                            if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
                            makeBorder(true, getLocator($scope.currentInstruction));
                            $scope.$apply();
                        }

                    });
                });
            });
    };

    /**
     * Method to handle close event
     *
     * @param void 
     *
     * @return object
     *
     */
    $scope.closed = () => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "closed",
                elements: {
                    test: "test"
                }
            }, function(resp) {})
        })
    };

    /**
     * Method to handle window blur event
     *
     * @param void 
     *
     * @return object
     *
     */
    window.onblur = function() {
        $scope.closed();
    };

    /**
     * Method to handle nested json keu
     *
     * @param object apiObj
     *
     * @return object
     *
     */
    function getNestedJsonKeys(apiObj) {
        var ops = [];

        function iterate(obj, parents = "") {
            if (typeof obj != "object") {
                ops.push({
                    key: parents,
                    val: obj
                });
                return;
            }
            for (var key in obj) {
                iterate(obj[key], parents != "" ? (parents + (!isNaN(key) ? "[" : ".") + key + (!isNaN(key) ? "]" : "")) : key);
            }
        }
        iterate(apiObj);
        return ops;
    }

    /**
     * Method to set api value
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.setApiValue = function() {
        $scope.currentInstruction.value = 'orderdata.' + $scope.api.apiValue.split(" ").join("");
    }

    /**
     * Method to get locator
     *
     * @param object obj
     *
     * @return object
     *
     */
    function getLocator(obj) {
        return obj.locator;
    }

    /**
     * Method to make border
     *
     * @param object condition
     * @param object locator
     *
     * @return object
     *
     */
    function makeBorder(condition, locator) { // set / reset
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "makeBox",
                set: condition,
                locator
            }, function(resp) {
                // resp got from content.js 
            });
        });
    }

    /**
     * Method to set value to dom element
     *
     * @param string value
     * @param object locator
     *
     * @return object
     *
     */
    function setValueToDom(value, locator) { // set / reset
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "setValue",
                value,
                locator,
                dropdownAsText: $scope.currentInstruction.dropdownMethod == 'text'
            }, function(resp) {
                // resp got from content.js 
            });
        });
    }

    /**
     * Method to handle go back action
     *
     * @param void
     *           
     * @return object     
     */
    $scope.goBack = function() {
        $scope.generatePageFlag = true;
    };

    /**
     * Method to make default locator
     *
     * @param object currentInstruction     
     *
     * @return object
     *
     */
    function makeDefaultLocator(currentInstruction) {
        if (!currentInstruction.selectedLocator) {
            if (!!currentInstruction.locator.id)
                currentInstruction.selectedLocator = "id";
            else if (!!currentInstruction.locator.name)
                currentInstruction.selectedLocator = "name";
            else if (!!currentInstruction.locator.xpath)
                currentInstruction.selectedLocator = "xpath";
        }
    }

    /**
     * Method to handle actions in next step
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.next = function() {

        $timeout(function(callback) {
            if ($scope.conditionFlag) {
                $scope.currentInstruction.enabled = true;
            }
        });

        makeBorder(false, getLocator($scope.currentInstruction));
        $scope.currentInstruction = $scope.response[++$scope.currentInstructionCount];
        makeDefaultLocator($scope.currentInstruction);
        if ($scope.currentInstruction.type == 'dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
        makeBorder(true, getLocator($scope.currentInstruction));
        debugger;
        if (typeof($scope.currentInstruction.value) !== 'object') {
            $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
            $scope.api.apiString = '';
        } else {
            $scope.api.apiString = $scope.currentInstruction.value.value;
            $scope.api.apiValue = '';
        }
        $scope.api.currentApiValue = null;

        if ($scope.conditionFlag) {
            $scope.currentInstruction.enabled = true;
        }

    };

    /**
     * Method to handle actions in previous step
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.previous = function() {
        makeBorder(false, getLocator($scope.currentInstruction));
        $scope.currentInstruction = $scope.response[--$scope.currentInstructionCount];
        makeBorder(true, getLocator($scope.currentInstruction));
        if (typeof($scope.currentInstruction.value) !== 'object') {
            $scope.api.apiValue = $scope.currentInstruction.value.split('orderdata.')[1];
            $scope.api.apiString = '';
        } else {
            $scope.api.apiString = $scope.currentInstruction.value.value;
            $scope.api.apiValue = '';
        }
        $scope.api.currentApiValue = null;

    };

    /**
     * Method to watch current instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.$watch('currentInstruction', (newVal, oldVal) => {
        if ($scope.generator.state) {
            console.log('state saved:', oldVal);
            $scope.displayApiValue();
            let value = ($scope.api.currentApiValue ? $scope.api.currentApiValue : $scope.currentInstruction.value.value || '');
            debugger;
            setValueToDom(value, getLocator($scope.currentInstruction));
            $scope.localState[$scope.generator.state] = {
                annualReport: {
                    instructions: $scope.response,
                    currentInstructionCount: $scope.currentInstructionCount
                }
            }

            localStorage.setItem('automationToolState', JSON.stringify(
                $scope.localState
            ))
        }
        $scope.getConditionStatus();
    }, true);

    /**
     *
     * Method to get instruction element
     *
     * @param object currentInstruction
     *
     * @return object
     */
    $scope.getInstrunctionElement = function(attr) {

        var element = {};

        switch (attr.type) {

            case 'textInput':

                element = {
                    "type": "textEntry",
                    "optional": false,
                    "param": {
                        "locator": {},
                        "value": {}
                    },
                    "auto": true
                };

                element.auto = attr.auto;
                element.param.locator[attr.selectedLocator] = attr.locator[attr.selectedLocator];
                element.param.value = attr.value;
                break;

            case 'elementClick':

                element = {
                    "type": "elementClick",
                    "optional": false,
                    "param": {},
                    "auto": false
                };

                element.auto = attr.auto;
                element.param[attr.selectedLocator] = attr.locator[attr.selectedLocator];
                break;

            case 'dropDownClick':

                element = {
                    "type": "dropDownClick",
                    "optional": false,
                    "param": {
                        "locator": {},
                    },
                    "auto": true
                };

                element.auto = attr.auto;
                element.param.locator[attr.selectedLocator] = attr.locator[attr.selectedLocator];
                if (attr.dropdownMethod == 'value')
                    element.param.value = attr.value;
                else
                    element.param.text = attr.value;

                break;

        };

        return element;

    };

    /**
     *
     * Method to get instruction of condition
     *
     * @param object attr
     *
     * @return object
     */
    $scope.getInstructionOfCondition = function() {

        var condition = {
                "type": "condition",
                "auto": true,
                "param": {
                    "switchValue": "",
                    "branches": []
                }
            },
            count = 0,
            current = 0,
            caseObj = {},
            element = {},
            caseValue = "";

        $scope.generation = {};
        $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
            .map(currentInstruction => {

                if (count == 0) {
                    condition.param.switchValue = currentInstruction.conditionVariable;
                }

                element = $scope.getInstrunctionElement(currentInstruction);
                if (currentInstruction.caseValue) {

                    caseValue = currentInstruction.caseValue.trim();
                    caseValue = caseValue.toLowerCase();

                    if (caseValue == "default") {

                        caseObj = {
                            "defaultCase": true,
                            "instructions": []
                        };

                    } else {
                        caseObj = {
                            "caseValue": {
                                "value": currentInstruction.caseValue
                            },
                            "instructions": []
                        };

                    }

                    if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                        let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                        if (currentInstruction.statusMsg) {
                            statusInst.param = currentInstruction.statusMsg; 
                        }                                                     
                        caseObj.instructions.push(statusInst);                            
                    }
                    caseObj.instructions.push(element);
                    condition.param.branches.push(caseObj);

                    count++;

                } else {

                    current = count - 1;
                    if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                        let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                        if (currentInstruction.statusMsg) {
                            statusInst.param = currentInstruction.statusMsg; 
                        }                                                     
                        condition.param.branches[current].instructions.push(statusInst);                            
                    }
                    condition.param.branches[current].instructions.push(element);
                }

            });
        $scope.instructions = condition;
        console.log($scope.instructions);
        $scope.generation.instructionsGenerated = true;

    };


    /**
     *
     * Method to generate instrunctions
     *
     * @param void
     *
     * @return object
     */
    $scope.generateInstructions = function() {

        var inst = [];
        if ($scope.conditionFlag) {
            $scope.getInstructionOfCondition();
            return;
        }

        $scope.generation = {};
        $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
            .map(currentInstruction => {                

                switch (currentInstruction.type) {
                    
                    case 'textInput':                        

                        let textEntry = {
                            "type": "textEntry",
                            "optional": false,
                            "param": {
                                "locator": {},
                                "value": {}
                            },
                            "auto": true
                        }

                        textEntry.auto = currentInstruction.auto;
                        textEntry.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
                        textEntry.param.value = currentInstruction.value;                        
 
                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {

                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        } 
                        inst.push(textEntry);                        
                        break;
                        
                    case 'elementClick':

                        let elementClick = {
                            "type": "elementClick",
                            "optional": false,
                            "param": {},
                            "auto": false
                        }
                        elementClick.auto = currentInstruction.auto;
                        elementClick.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
                        
                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {
                            
                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        }
                        inst.push(elementClick); 
                        break;

                    case 'dropDownClick':

                        let dropDownClick = {
                            "type": "dropDownClick",
                            "optional": false,
                            "param": {
                                "locator": {},
                            },
                            "auto": true
                        }
                        dropDownClick.auto = currentInstruction.auto;
                        dropDownClick.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
                        if (currentInstruction.dropdownMethod == 'value')
                            dropDownClick.param.value = currentInstruction.value;
                        else
                            dropDownClick.param.text = currentInstruction.value;

                        if (typeof currentInstruction.statusInstruction !== "undefined" 
                            && currentInstruction.statusInstruction) {
                            
                            let statusInst = {"type" : "status","param" : "Please wait...", "auto": true };
                            if (currentInstruction.statusMsg) {
                                statusInst.param = currentInstruction.statusMsg; 
                            }                             
                            inst.push(statusInst);                            
                        }
                        inst.push(dropDownClick); 
                        break;                        

                }

            });


        $scope.instructions = inst;
        console.log($scope.instructions);
        $scope.generation.instructionsGenerated = true;

    }    

    /**
     *
     * Method to copy to clip board
     *
     * @param void
     *
     * @return object
     */
    $scope.copyToClipBoard = function() {
        var input = document.createElement("textarea");
        input.setAttribute("style", "width: 0;height: 0;opacity: 0;position: absolute;");
        input.setAttribute("id", "jsonText");
        input.value = JSON.stringify($scope.instructions);;
        document.body.appendChild(input);
        var copyText = document.getElementById("jsonText");
        copyText.select();
        document.execCommand("copy");
        $scope.generation.copied = true;
    };

    /**
     *
     * Method to display api value
     *
     * @param void
     *
     * @return object
     */
    $scope.displayApiValue = function() {
        var currentApiValue;
        if ($scope.apiKeys.some(e => {
                if (e.key == $scope.api.apiValue) {
                    currentApiValue = e.val;
                    return true;
                }
            }))
            $scope.api.currentApiValue = currentApiValue;
        else $scope.api.currentApiValue = false;
    }


    // Condition functions here...    

    /**
     * Method to start conditional operation
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.conditionStarts = function() {

        $scope.conditionFlag = false;
        $scope.currentInstruction.enabled = false;
        $scope.currentInstruction.conditionStarts = !$scope.currentInstruction.conditionStarts;
        if ($scope.currentInstruction.conditionStarts) {
            $scope.conditionFlag = true;
            $scope.currentInstruction.enabled = true;
        }
        $scope.conditionArray[$scope.currentInstructionCount] = {
            conditionStarts: !$scope.currentInstruction.conditionStarts,
            case: $scope.condition.caseString
        };

    };

    /**
     * Method to set conditional variable
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.setConditionalVariable = function() {
        $scope.currentInstruction.conditionVariable = 'orderdata.' + $scope.condition.apiValue;
    };

    /**
     * Method to set case string
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.setCaseString = function() {        
        $scope.currentInstruction.caseValue = $scope.condition.caseString;
    };    


    /**
     * Method to get condition status
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.getConditionStatus = function() {
        currentCondition = [];
        console.log(
            $scope.response.some((e, i) => {
                debugger;
                if (e.conditionStarts) currentCondition.push(i);
                if (e.conditionEnds) currentCondition.pop();
                return (currentInstruction == i && !!currentCondition.length)
            })
        );
    };

    /**
     * Method to add status instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.addStatusInstruction = function() {                        
        $scope.currentInstruction.statusInstruction = $scope.currentInstruction.statusInstruction;
    };

    /**
     * Method to update status instruction
     *
     * @param void
     *
     * @return object
     *
     */
    $scope.updateStatusInstruction = function() {                        
        $scope.currentInstruction.statusMsg = $scope.currentInstruction.statusMsg;
    };



});