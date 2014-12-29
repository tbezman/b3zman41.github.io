angular.module("nycOpen", ["ngMaterial"]).controller("appController", ["$scope", "$http", "$mdToast", function ($scope, $http, $mdToast) {

    var initRequest = {
        url: "http://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=0"
    }

    $scope.boards = {"Bronx": {start: 1, end: 12}, "Brooklyn": {start: 1, end: 18}, "Manhattan": {start: 1, end: 14}, "Queens": {start: 1, end: 18}, "Staten Island": {start: 1, end: 3}};

    $scope.agencies = getAgencies();
    $scope.complaintTypes = getComplaintTypes();
    $scope.statuses = getStatuses();

    $scope.limit = 200;
    $scope.tableCount = $scope.limit;

    $scope.dataLength = 0;

    $scope.page = 1;


    //Initialize arrays
    $scope.boroughs = [];
    $scope.cbNums = [];

    //Initialize the CB data
    for(var key in $scope.boards){
        $scope.boroughs.push(key);
    }

    //Update the valid dates for the datepicker
    $("#datePicker").on("apply.daterangepicker", function (ev, picker) {
        $scope.dateSpanStart = picker.startDate;
        $scope.dateSpanEnd = picker.endDate;
    })

    //Initialize the sorting for the table
    $("#mainTable th").each(function () {
        var link = $(this).attr("tdLink");

        $(this).click(function () {
            if($scope.tableSortColumn === link){
                $scope.sortSwitch *= -1;
            }else $scope.sortSwitch = 1;

            $scope.tableSortColumn = link;

            $("#mainTable th").each(function () {
                $(this).find("#iconSpan").remove();
            })

            var iconSpan = document.createElement("span");
            iconSpan.id = "iconSpan";

            $(iconSpan).attr("flex", "");

            iconSpan.style.float = "right";

            if($scope.sortSwitch === 1)
                iconSpan.className = "glyphicon glyphicon-chevron-down";
            else iconSpan.className = "glyphicon glyphicon-chevron-up";

            $(this).append($(iconSpan));

            $scope.data.sort(comparator);

            $scope.resultRows = getTableArray($scope.data);

            $scope.$apply();

            function comparator(a, b){
                if(a[link].toLowerCase() < b[link].toLowerCase()){
                    return -1 * $scope.sortSwitch;
                }else if(a[link].toLowerCase() > b[link].toLowerCase()){
                    return 1 * $scope.sortSwitch;
                }else return 0;
            }
        });
});

    //Initialize the pagination clicking and updating
    $("#paginatorList li").each(function () {
        $(this).click(function () {
            $("#paginatorList li").each(function () {
                $(this).removeAttr("class");
            });

            $(this).attr("class", "active");

            $scope.page = $(this).find("a").html();
            $scope.updateQuery();
        });
    });

    //Updates the CB Number with the correct ones for that Borough
    $scope.updateBoard = function () {
        if($scope.boards[$scope.boroughSelect]) {
            $scope.cbNums = [];
            for (var i = $scope.boards[$scope.boroughSelect].start; i <= $scope.boards[$scope.boroughSelect].end; i++) {
                $scope.cbNums.push(i);
            }
        }else $scope.cbNums = [];
    };

    //Clears all fields in the query section
    $scope.clearFields = function(){
        console.log("CLEARING FIELDS");

        $("#datePicker").val("");
        $scope.dateSpanStart = "";
        $scope.dateSpanEnd = "";

        $scope.boroughSelect = "";
        $scope.cbNumberSelect = "";
        $scope.agencySelect = "";
        $scope.complaintTypeSelect = "";
        $scope.incidentAddressInput = "";
        $scope.statusSelect = "";
    };

    //Constructs the url and then goes to the CSV link on Socrata
    $scope.exportData = function () {
        var url = ("http://data.cityofnewyork.us/resource/erm2-nwe9.csv" + constructURL("NOLIMIT"));
        window.location = url;
    }

    //For the filter button click
    $scope.filterQuery = function () {
        $("#paginatorList").css({visibility: "hidden"});

        $scope.page = 1;
        $scope.resetPagination();

        $scope.updateQuery();
    }

    //Update the data in the table with current criteria
    $scope.updateQuery = function () {

        var scope = "http://data.cityofnewyork.us/resource/erm2-nwe9.json";

        var url = scope + constructURL();

        console.log(url);

        $("#loadingIcon").removeAttr("style");
        $("#loadingIcon").parent().css({height: "70%"});

        $("#mainTable").css({display: "none"});

        $http.get(url).success(function(data, status, headers, config){
            $scope.columnsHeaders = ["Created Date", "Compliant Type", "Agency", "Descriptor", "Incident Address", "Borough", "Incident Zip", "Community Board"];

            $scope.resultRows = [];
            $scope.data = data;

            for(var i = 0; i < data.length; i++){
                var newRow = {};

                newRow.createdDate = new Date(data[i].created_date).toDateString().substr(4, data[i].created_date.length-4);
                newRow.complaintType = data[i].complaint_type;
                newRow.agency = data[i].agency;
                newRow.descriptor = data[i].descriptor;
                newRow.incidentAddress = data[i].incident_address;
                newRow.incidentZip = data[i].incident_zip;
                newRow.borough = data[i].borough;
                newRow.communityBoard = data[i].community_board;
                newRow.status = data[i].status;

                $scope.resultRows.push(newRow);
            }

            //Getting the actual amount of rows in the database for this query
            $http.get(url + "&$select=COUNT(unique_key)").success(function (uniqueData) {
                if (uniqueData[0] && uniqueData[0].count_unique_key) {
                    $scope.dataLength = uniqueData[0].count_unique_key.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    $scope.dataLengthRaw = uniqueData[0].count_unique_key;
                }

                $("#paginatorList").empty();

                $scope.maxPage = Math.ceil($scope.dataLengthRaw / $scope.limit);

                //Updating the pagination
                for(var i = 1; i <= $scope.maxPage; i++){
                    var li = document.createElement("li");

                    $(li).click(function () {
                        $("#paginatorList li").each(function () {
                            $(this).removeAttr("class");
                        });

                        $(this).attr("class", "active");

                        $scope.page = $(this).find("a").html();
                        $scope.updateQuery();
                    });

                    var a = document.createElement("a");
                    a.innerHTML = (i).toString();

                    li.appendChild(a);

                    $("#paginatorList").append($(li));
                }

                var prevPage = document.createElement("li");
                var prevA = document.createElement("a");

                prevPage.className = "specialPage";
                prevPage.id = "prevPage";
                prevA.className = "glyphicon glyphicon-chevron-left";

                prevPage.appendChild(prevA);


                $(prevPage).click(function () {
                    if($scope.page > 1){
                        $scope.page = parseInt($scope.page) - 1;
                        $scope.updateQuery();
                    }
                });

                var nextPage = document.createElement("li");
                var nextA = document.createElement("a");

                nextPage.className = "specialPage";
                nextPage.id = "nextPage";
                nextA.className = "glyphicon glyphicon-chevron-right";

                nextPage.appendChild(nextA);

                $(nextPage).click(function () {
                    if($scope.page < (Math.ceil($scope.dataLengthRaw / $scope.limit))){
                        $scope.page = parseInt($scope.page) + 1;
                        $scope.updateQuery();
                    }
                });

                $("#paginatorList").prepend(prevPage);
                $("#paginatorList").append(nextPage);


                $scope.renderPagination();

                $("#loadingIcon").css({display: "none"});
                $("#loadingIcon").parent().removeAttr("style");

                $("#mainTable").css({display: "block"});
            });
});
}

    //Updates the pagination to show the correct amount of page #
    $scope.renderPagination = function () {
        var pageLimit = 10;
        var pageRadius = pageLimit / 2;

        var page = parseInt($scope.page);

        $("#paginatorList").css({visibility: "hidden"});

        $("#paginatorList li").each(function () {
            var i = $(this).find("a").html();

            if(i == $scope.page){
                $(this).attr("class", "active");
            }

            if((i >= page - pageRadius && i <= page + pageRadius) || ($(this).attr("class") === "specialPage")){
                $(this).css({display: ""});
            }else $(this).css({display: "none"});
        });

        console.log("Page : " + $scope.page);

        if ($scope.page == $scope.maxPage) {
            $("#nextPage").remove();
        };

        if ($scope.page == 1) {
            console.log("Trying to remove prevPage");
            $("#prevPage").remove();
        };

        $("#paginatorList").css({visibility: "visible"});
    }

    //Makes the pagination back to 10 count
    $scope.resetPagination = function(){
        $("#paginatorList li").each(function () {
            $(this).remove();
        })

        for(var i = 1; i <= 10; i++){
            var li = document.createElement("li");

            $(li).click(function () {
                $("#paginatorList li").each(function () {
                    $(this).removeAttr("class");
                });

                $(this).attr("class", "active");

                $scope.page = $(this).find("a").html();
                $scope.updateQuery();
            });

            var a = document.createElement("a");
            a.innerHTML = i.toString();

            li.appendChild(a);

            $("#paginatorList").append($(li));
        }
    }

    //Returns the parameters for the DB
    function constructURL(noLimit){
        var scope = "";
        var parameters = "?"

        if(!noLimit) {
            parameters += "$limit=" + $scope.limit + "&";
        }else{}


        var where ="$where=";

        var conditionCounter = 0;

        if($scope.cbNumberSelect && $scope.boroughSelect){
            where += "community_board='" + getCBNumber($scope.cbNumberSelect) + " "  + $scope.boroughSelect + "'";

            conditionCounter++;
        }else if ($scope.boroughSelect){
            where += "borough='" + $scope.boroughSelect + "'";

            conditionCounter++;
        }

        console.log($scope.dateSpanStart)

        if($scope.dateSpanStart && $scope.dateSpanEnd){
            if(conditionCounter > 0){
                where += " AND ";
            }

            where += "(created_date > '" + dateStringToWeirdFormat($scope.dateSpanStart) + "' AND created_date < '" + dateStringToWeirdFormat($scope.dateSpanEnd) + "')";

            conditionCounter++;
        }

        if($scope.agencySelect){
            if(conditionCounter > 0){
                where += " AND ";
            }

            where += "agency='" + $scope.agencySelect + "'";

            conditionCounter++;
        }

        if($scope.incidentAddressInput){
            if(conditionCounter > 0){
                where += " AND ";
            }

            where += "incident_address='" + $scope.incidentAddressInput + "'";

            conditionCounter++;
        }

        if($scope.statusSelect){
            if(conditionCounter > 0){
                where += " AND ";
            }

            where += "status='" + $scope.statusSelect + "'";

            conditionCounter++;
        }1


        if($scope.complaintTypeSelect){
            if(conditionCounter > 0){
                where += " AND ";
            }

            where += "complaint_type='" + $scope.complaintTypeSelect + "'";

            conditionCounter++;
        }

        if($scope.page && !noLimit){
            if(conditionCounter > 0){
                parameters += "&";
            }

            parameters += "$offset=" + ($scope.page-1) * $scope.limit + "&";
        }


        if(conditionCounter > 0)
            parameters += where;

        var url = scope + parameters;

        return url;
    }

}]);

function getAgencies(){
    return [
    "3-1-1"
    ,

    "ACS"
    ,

    "AJC"
    ,

    "ART"
    ,

    "CAU"
    ,

    "CCRB"
    ,

    "CHALL"
    ,

    "COIB"
    ,

    "CWI"
    ,

    "DCA"
    ,

    "DCAS"
    ,

    "DCLA"
    ,

    "DCP"
    ,

    "DEP"
    ,

    "DFTA"
    ,

    "DHS"
    ,

    "DOB"
    ,

    "DOC"
    ,

    "DOE"
    ,

    "DOF"
    ,

    "DOHMH"
    ,

    "DOITT"
    ,

    "DOP"
    ,

    "DORIS"
    ,

    "DOT"
    ,

    "DPR"
    ,

    "DSNY"
    ,

    "DV"
    ,

    "DYCD"
    ,

    "EDC"
    ,

    "EMTF"
    ,

    "FDNY"
    ,

    "FUND"
    ,

    "HPD"
    ,

    "HRA"
    ,

    "LAW"
    ,

    "LOFT"
    ,

    "MOC"
    ,

    "MOFTB"
    ,

    "MOIA"
    ,

    "MOPD"
    ,

    "MOVA"
    ,

    "NYCERS"
    ,

    "NYCHA"
    ,

    "NYCOOA"
    ,

    "NYCPPF"
    ,

    "NYCSERVICE"
    ,

    "NYPD"
    ,

    "OAE"
    ,

    "OATH"
    ,

    "OCHIA"
    ,

    "OCME"
    ,

    "OEM"
    ,

    "OMB"
    ,

    "OPA"
    ,

    "OPS"
    ,

    "SBS"
    ,

    "TFA"
    ,

    "TLC"
    ,

    "UNCC"
    ,

    "VAC"
    ,

    "WF1"

    ]
}

function getStatuses(){
    return [

    "Assigned"
    ,

    "Cancelled"
    ,

    "Closed"
    ,

    "Closed - By Phone"
    ,

    "Closed - Email Sent"
    ,

    "Closed - In-Person"
    ,

    "Closed - Insufficient Info"
    ,

    "Closed - Letter Sent"
    ,

    "Closed - No Response Needed"
    ,

    "Closed - Other"
    ,

    "Closed - Testing"
    ,

    "Draft"
    ,

    "Email Sent"
    ,

    "In Progress"
    ,

    "In Progress - Needs Approval"
    ,

    "Open"
    ,

    "Pending"
    ,

    "Started"
    ,

    "To Be Rerouted"
    ,

    "Unable To Respond"
    ,

    "Unassigned"
    ,

    "Unspecified"

    ];
}

function getComplaintTypes(){
    return [

    "Adopt-A-Basket"
    ,

    "Agency Issues"
    ,

    "Air Quality"
    ,

    "Animal Abuse"
    ,

    "Animal Facility - No Permit"
    ,

    "Animal in a Park"
    ,

    "APPLIANCE"
    ,

    "Asbestos"
    ,

    "Beach/Pool/Sauna Complaint"
    ,

    "Benefit Card Replacement"
    ,

    "BEST/Site Safety"
    ,

    "Bike Rack Condition"
    ,

    "Bike/Roller/Skate Chronic"
    ,

    "Blocked Driveway"
    ,

    "Boilers"
    ,

    "Bottled Water"
    ,

    "Bridge Condition"
    ,

    "Broken Muni Meter"
    ,

    "Broken Parking Meter"
    ,

    "Building Condition"
    ,

    "Building/Use"
    ,

    "Bus Stop Shelter Placement"
    ,

    "Calorie Labeling"
    ,

    "City Vehicle Placard Complaint"
    ,

    "Collection Truck Noise"
    ,

    "Comment"
    ,

    "Complaint"
    ,

    "Compliment"
    ,

    "CONSTRUCTION"
    ,

    "Consumer Complaint"
    ,

    "Cranes and Derricks"
    ,

    "Curb Condition"
    ,

    "Damaged Tree"
    ,

    "DCA / DOH New License Application Request"
    ,

    "DCA Literature Request"
    ,

    "Dead Tree"
    ,

    "DEP Literature Request"
    ,

    "Derelict Bicycle"
    ,

    "Derelict Vehicle"
    ,

    "Derelict Vehicles"
    ,

    "DFTA Literature Request"
    ,

    "DHS Income Savings Requirement"
    ,

    "Dirty Conditions"
    ,

    "Discipline and Suspension"
    ,

    "Disorderly Youth"
    ,

    "DOE Complaint or Compliment"
    ,

    "DOF Literature Request"
    ,

    "DOF Parking - Payment Issue"
    ,

    "DOF Parking - Request Status"
    ,

    "DOF Parking - Tax Exemption"
    ,

    "DOF Property - City Rebate"
    ,

    "DOF Property - Payment Issue"
    ,

    "DOF Property - Reduction Issue"
    ,

    "DOF Property - RPIE Issue"
    ,

    "DOOR/WINDOW"
    ,

    "DOT Literature Request"
    ,

    "DPR Internal"
    ,

    "DPR Literature Request"
    ,

    "Drinking"
    ,

    "Drinking Water"
    ,

    "DWD"
    ,

    "EAP Inspection - F59"
    ,

    "ELECTRIC"
    ,

    "Electrical"
    ,

    "ELEVATOR"
    ,

    "Emergency Response Team (ERT)"
    ,

    "Ferry Complaint"
    ,

    "Ferry Inquiry"
    ,

    "Ferry Permit"
    ,

    "Fire Alarm - Addition"
    ,

    "Fire Alarm - Modification"
    ,

    "Fire Alarm - New System"
    ,

    "Fire Alarm - Reinspection"
    ,

    "Fire Alarm - Replacement"
    ,

    "Fire Safety Director - F58"
    ,

    "FLOORING/STAIRS"
    ,

    "Food Establishment"
    ,

    "Food Poisoning"
    ,

    "Forensic Engineering"
    ,

    "For Hire Vehicle Complaint"
    ,

    "For Hire Vehicle Report"
    ,

    "Forms"
    ,

    "Found Property"
    ,

    "Gas Station Discharge Lines"
    ,

    "GENERAL"
    ,

    "GENERAL CONSTRUCTION"
    ,

    "General Construction/Plumbing"
    ,

    "Graffiti"
    ,

    "Harboring Bees/Wasps"
    ,

    "Hazardous Materials"
    ,

    "Hazmat Storage/Use"
    ,

    "Health"
    ,

    "HEAT/HOT WATER"
    ,

    "HEATING"
    ,

    "Highway Condition"
    ,

    "Highway Sign - Damaged"
    ,

    "Highway Sign - Dangling"
    ,

    "Highway Sign - Missing"
    ,

    "Home Care Provider Complaint"
    ,

    "Homeless Encampment"
    ,

    "Homeless Person Assistance"
    ,

    "HPD Literature Request"
    ,

    "IGR"
    ,

    "Illegal Animal Kept as Pet"
    ,

    "Illegal Animal Sold"
    ,

    "Illegal Animal - Sold/Kept"
    ,

    "Illegal Fireworks"
    ,

    "Illegal Parking"
    ,

    "Illegal Tree Damage"
    ,

    "Indoor Air Quality"
    ,

    "Indoor Sewage"
    ,

    "Industrial Waste"
    ,

    "Interior Demo"
    ,

    "Internal Code"
    ,

    "Investigations and Discipline (IAD)"
    ,

    "Invitation"
    ,

    "Lead"
    ,

    "Legal Services Provider Complaint"
    ,

    "Lifeguard"
    ,

    "Literature Request"
    ,

    "Litter Basket / Request"
    ,

    "Lost Property"
    ,

    "Maintenance or Facility"
    ,

    "Micro Switch"
    ,

    "Misc. Comments"
    ,

    "Miscellaneous Categories"
    ,

    "Missed Collection (All Materials)"
    ,

    "Mold"
    ,

    "Municipal Parking Facility"
    ,

    "No Child Left Behind"
    ,

    "Noise"
    ,

    "Noise - Commercial"
    ,

    "Noise - Helicopter"
    ,

    "Noise - House of Worship"
    ,

    "Noise - Park"
    ,

    "Noise - Street/Sidewalk"
    ,

    "Noise Survey"
    ,

    "Noise - Vehicle"
    ,

    "NONCONST"
    ,

    "Non-Residential Heat"
    ,

    "OEM Disabled Vehicle"
    ,

    "OEM Literature Request"
    ,

    "Open Flame Permit"
    ,

    "Opinion for the Mayor"
    ,

    "Other Enforcement"
    ,

    "OUTSIDE BUILDING"
    ,

    "Overflowing Litter Baskets"
    ,

    "Overflowing Recycling Baskets"
    ,

    "Overgrown Tree/Branches"
    ,

    "PAINT - PLASTER"
    ,

    "PAINT/PLASTER"
    ,

    "Panhandling"
    ,

    "Parent Leadership"
    ,

    "Parking Card"
    ,

    "Plant"
    ,

    "PLUMBING"
    ,

    "Poison Ivy"
    ,

    "Portable Toilet"
    ,

    "Posting Advertisement"
    ,

    "Public Assembly"
    ,

    "Public Assembly - Temporary"
    ,

    "Public Payphone Complaint"
    ,

    "Public Toilet"
    ,

    "Radioactive Material"
    ,

    "Rangehood"
    ,

    "Recycling Enforcement"
    ,

    "Registration and Transfers"
    ,

    "Request for Information"
    ,

    "Request Xmas Tree Collection"
    ,

    "Rodent"
    ,

    "Root/Sewer/Sidewalk Condition"
    ,

    "SAFETY"
    ,

    "Sanitation Condition"
    ,

    "Scaffold Safety"
    ,

    "School Maintenance"
    ,

    "SCRIE"
    ,

    "SDEP"
    ,

    "SDSC"
    ,

    "Senior Center Complaint"
    ,

    "Sewer"
    ,

    "Sewer "
    ,

    "SG-51"
    ,

    "SG-71"
    ,

    "SG-98"
    ,

    "Sidewalk Condition"
    ,

    "Smoking"
    ,

    "Snow"
    ,

    "SNW"
    ,

    "Special Enforcement"
    ,

    "Special Natural Area District (SNAD)"
    ,

    "Special Projects Inspection Team (SPIT)"
    ,

    "Sprinkler - Mechanical"
    ,

    "Squeegee"
    ,

    "Stalled Sites"
    ,

    "Standing Water"
    ,

    "Standpipe - Mechanical"
    ,

    "Street Condition"
    ,

    "Street Light Condition"
    ,

    "Street Sign - Damaged"
    ,

    "Street Sign - Dangling"
    ,

    "Street Sign - Missing"
    ,

    "STRUCTURAL"
    ,

    "STSK"
    ,

    "Summer Camp"
    ,

    "Sweeping/Inadequate"
    ,

    "Sweeping/Missed"
    ,

    "Sweeping/Missed-Inadequate"
    ,

    "Tanning"
    ,

    "Tattooing"
    ,

    "Taxi Complaint"
    ,

    "Taxi Compliment"
    ,

    "Taxi Report"
    ,

    "Teaching/Learning/Instruction"
    ,

    "Traffic"
    ,

    "Traffic Signal Condition"
    ,

    "Trans Fat"
    ,

    "Transportation Provider Complaint"
    ,

    "Trapping Pigeon"
    ,

    "Tunnel Condition"
    ,

    "Unleashed Dog"
    ,

    "Unlicensed Dog"
    ,

    "Unsanitary Animal Facility"
    ,

    "Unsanitary Animal Pvt Property"
    ,

    "UNSANITARY CONDITION"
    ,

    "Unsanitary Pigeon Condition"
    ,

    "Urinating in Public"
    ,

    "VACANT APARTMENT"
    ,

    "Vacant Lot"
    ,

    "Vending"
    ,

    "Violation of Park Rules"
    ,

    "Water Conservation"
    ,

    "WATER LEAK"
    ,

    "Water Quality"
    ,

    "Water System"
    ,

    "Water System "
    ,

    "Window Guard"
    ,

    "WLWP"
    ,

    "WNW"
    ,

    "X-Ray Machine/Equipment"

    ]
}

function getCBNumber(num){
    if(num < 10){
        return "0" + num;
    }else return num;
}

//Turns Socrata data into blob
function getTableArray(data){
    returnRows = [];

    for(var i = 0; i < data.length; i++){
        var newRow = {};

        newRow.createdDate = new Date(data[i].created_date).toDateString();
        newRow.complaintType = data[i].complaint_type;
        newRow.agency = data[i].agency;
        newRow.descriptor = data[i].descriptor;
        newRow.incidentAddress = data[i].incident_address;
        newRow.incidentZip = data[i].incident_zip;
        newRow.borough = data[i].borough;
        newRow.communityBoard = data[i].community_board;
        newRow.status = data[i].status;

        returnRows.push(newRow);
    }

    return returnRows;
}

//Fucking Socrata format
function dateStringToWeirdFormat(date){
    var returnDate = date.format("YYYY-MM-DD");
    returnDate += "T00:00:00";

    return returnDate;
}

document.addEventListener("DOMContentLoaded", function () {
})