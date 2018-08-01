
// chrome.storage.sync.get('color', function(data) {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
//   codeBox.setAttribute('value', "data.color");

//   document.getElementById("codeBox").value=""
// });


  var app = angular.module("myApp", []); 

  app.controller("myCtrl",function($scope){

    $scope.response=null;
    $scope.checks=[];
    $scope.currentInstructionCount=0;
    $scope.locator = 'id';
    $scope.changeLocator = function(locator){
      console.log(locator);
    }

    $scope.generateCode = function(){


      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type:"getText"}, function(resp){
    
            $scope.response = resp;
            console.log("response from Page: ",resp);
            if(!resp || !resp.length){
              alert("No fields found");
              console.error("No fields found");            
            } 
            else{
            $scope.currentInstructionString = $scope.response[$scope.currentInstructionCount];
            $scope.currentInstruction = JSON.parse($scope.currentInstructionString);
            makeBorder(true,getLocator($scope.currentInstructionString));
            $scope.$apply();
            }
    
        });
      });


    }

    

function getLocator(str){
  console.log("locator: ",str);
  obj=JSON.parse(str);
  return obj.param.locator;
} 
function makeBorder(condition,locator){  // set / reset
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {type:"changeDom",set:condition,locator}, function(resp){
      // resp got from content.js 
      });
    });
  }

    $scope.next = function(){
      makeBorder(false,getLocator($scope.currentInstructionString));
      $scope.currentInstructionString = $scope.response[++$scope.currentInstructionCount];
      $scope.currentInstruction = JSON.parse($scope.currentInstructionString);
      // alert($scope.currentInstruction.type);
      makeBorder(true,getLocator($scope.currentInstructionString));
    }
    $scope.previous = function(){
      makeBorder(false,getLocator($scope.currentInstructionString));
      $scope.currentInstructionString = $scope.response[--$scope.currentInstructionCount];
      $scope.currentInstruction = JSON.parse($scope.currentInstructionString);
      makeBorder(true,getLocator($scope.currentInstructionString));
    }


  })

  app.directive("template",function(){
    return {
      restrict: 'E',
      scope: {
        instruction: '='
      },
      template: '<textarea id="codeBox">instruction</textarea>'
  }
  })






