<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_url = ref('');
let crime_table = ref([]);
let crime_code = ref([]);
let table_headings = ref([]);
let crime_neighborhood = ref([]);
let refresh = ref(0);
let dialog_err = ref(false);
let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,
            lng: -93.102222,
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: null},
            {location: [44.977413, -93.025156], marker: null},
            {location: [44.931244, -93.079578], marker: null},
            {location: [44.956192, -93.060189], marker: null},
            {location: [44.978883, -93.068163], marker: null},
            {location: [44.975766, -93.113887], marker: null},
            {location: [44.959639, -93.121271], marker: null},
            {location: [44.947700, -93.128505], marker: null},
            {location: [44.930276, -93.119911], marker: null},
            {location: [44.982752, -93.147910], marker: null},
            {location: [44.963631, -93.167548], marker: null},
            {location: [44.973971, -93.197965], marker: null},
            {location: [44.949043, -93.178261], marker: null},
            {location: [44.934848, -93.176736], marker: null},
            {location: [44.913106, -93.170779], marker: null},
            {location: [44.937705, -93.136997], marker: null},
            {location: [44.949203, -93.093739], marker: null}
        ]
    }
);

// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map.leaflet);
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });
});


// FUNCTIONS
// Function called once user has entered REST API URL
function initializeCrimes() {
    // TODO: get code and neighborhood data
    fetch(crime_url.value + '/codes?').then((res) => {
            return res.json()
        }).then((code) => {
            crime_code = code;
        }).catch((error) => {
            console.log(error.message);
        });

    fetch(crime_url.value + '/neighborhoods?').then((res) => {
            return res.json()
        }).then((hood) => {
            crime_neighborhood = hood;
        }).catch((error) => {
            console.log(error.message);
        });

    //       get initial 1000 crimes
    fetch(crime_url.value + '/incidents?limit=1000').then((response) => {
        return response.json();
    }).then((data) => {
        
        //loop to replace code with type
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < crime_code.length; j++) {
                if (data[i].code == crime_code[j].code)
                {
                    data[i].code = crime_code[j].type;
                }
            delete data[i].incident; //remove redundant incident column
        }}

        //loop to replace number with name
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < crime_neighborhood.length; j++) {
                if (data[i].neighborhood_number == crime_neighborhood[j].id)
                {
                    data[i].neighborhood_number = crime_neighborhood[j].name;
                }
        }};
        
        // function task(j) { 
        //     setTimeout(function() { 
        //         let loc = crime_neighborhood[j].name + ', st. paul, minnesota';
        //         let req = fetch('https://nominatim.openstreetmap.org/search?q='+ loc +'&format=json&limit=1');
        //         Promise.all([req])
        //         .then((response) => {
        //         return Promise.all([response[0].json()]);
        //         }).then((data) => {
        //         console.log(data);
        //         let lat = parseFloat(data[0][0].lat);
        //         let lon = parseFloat(data[0][0].lon);
        //         L.marker([lat, lon]).addTo(map);
        //         }).catch((error) => { 
        //         console.log(error.message)}
        //     )}, 2000 * j);
        // } 
        // //add markers to neighborhoods
        // for (let j = 0; j < crime_neighborhood.length; j++) {
        //     task(j);
        //     };

        let jsonString = JSON.stringify(data);
        jsonString = jsonString.replaceAll("code", "incident_type");
        jsonString = jsonString.replaceAll("neighborhood_number", "neighborhood_name");
        data = JSON.parse(jsonString);

        table_headings = Object.keys(data[0]);
        crime_table = data;
        
        console.log(crime_table);
        refresh.value += 1;
    }).catch((error) => {
        console.log(error.message);
    });
}

// Function called when user presses 'OK' on dialog box
function closeDialog() {
    let dialog = document.getElementById('rest-dialog');
    let url_input = document.getElementById('dialog-url');
    if (crime_url.value !== '' && url_input.checkValidity()) {
        dialog_err.value = false;
        dialog.close();
        initializeCrimes();
    }
    else {
        dialog_err.value = true;
    }
}

//Refresh table based on the filter
function tableRefresh() {
    let url = crime_url.value + '/incidents?';
}

//Create and insert new incident
function createIncident() {
}


</script>

<template>
    
    <div class="grid-x grid-padding-x">
            <button type="button" class="cell large-auto button" @click="" style="background-color: green;">New Incident Form</button>
            <button type="button" class="cell large-auto button" @click="" style="background-color: rebeccapurple;">About</button>
    </div>
    <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8000" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialog">OK</button>
    </dialog>
    <div class="grid-container ">
        <div class="grid-x grid-padding-x align-justify">
            <div class="grid-x">
                <p class="space-left">Longitude: </p>
                <input id="longitude" class="coord-input space-left" type="text" placeholder="http://localhost:8000"/>
                <p class="space-left">Latitude:</p>
                <input id="latitude" class="coord-input space-left" type="text" placeholder="http://localhost:8000"/>
            </div>
            <button class="button coord-button" type="button">Go</button>
        </div>
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
        <div class="grid-container">
            <div class="grid-x grid-padding-x">
                <div class="large-4">
                    <strong>incident_type</strong><br>
                    <input checked="true" type="checkbox" id="Burglary" value="Burglary" @change="tableRefresh"/>
                        <label for="Burglary">Burglary</label> 
                    <input checked="true" type="checkbox" id="Rape" value="210,220" @change="tableRefresh"/>
                        <label for="Rape">Rape</label> 
                    <input checked="true" type="checkbox" id="Robbery" value="311," @change="tableRefresh"/>
                        <label for="Robbery">Robbery</label> <br>
                    <input checked="true" type="checkbox" id="Theft" value="Theft" @change="tableRefresh"/>
                        <label for="Theft">Theft</label> 
                    <input checked="true" type="checkbox" id="Motor Vehicle Theft" value="Motor Vehicle Theft" @change="tableRefresh"/>
                        <label for="Motor Vehicle Theft">Motor Vehicle Theft</label> 
                    <input checked="true" type="checkbox" id="Narcotics" value="Narcotics" @change="tableRefresh"/>
                        <label for="Narcotics">Narcotics</label> <br>
                    <input checked="true" type="checkbox" id="Proactive Police Visit" value="Proactive Police Visit" @change="tableRefresh"/>
                        <label for="Proactive Police Visit">Proactive Police Visit</label>
                    <input checked="true" type="checkbox" id="Criminal Damage to Property" value="Criminal Damage to Property" @change="tableRefresh"/>
                        <label for="Criminal Damage to Property">Criminal Damage to Property</label>
                    <input checked="true" type="checkbox" id="Assault" value="Assault" @change="tableRefresh"/>
                        <label for="Assault">Assault</label>
                    <input checked="true" type="checkbox" id="Weapon" value="Weapon" @change="tableRefresh"/>
                        <label for="Weapon">Weapon</label>
                    <input checked="true" type="checkbox" id="Homocide" value="100" @change="tableRefresh"/>
                        <label for="Homocide">Homocide</label>
                    <input checked="true" type="checkbox" id="Murder" value="110,120" @change="tableRefresh"/>
                        <label for="Murder">Murder</label>
                </div>
                <div class="large-4">
                    <strong>neighborhood_name</strong><br>
                    <input checked="true" type="checkbox" id="Conway/Battlecreek/Highwood" value=1 @change="tableRefresh"/>
                        <label for="Conway/Battlecreek/Highwood">Conway/Battlecreek/Highwood</label> 
                    <input checked="true" type="checkbox" id="Greater East Side" value=2 @change="tableRefresh"/>
                        <label for="Greater East Side">Greater East Side</label> <br>
                    <input checked="true" type="checkbox" id="West Side" value=3 @change="tableRefresh"/>
                        <label for="West Side">West Side</label>
                    <input checked="true" type="checkbox" id="Dayton's Bluff" value=4 @change="tableRefresh"/>
                        <label for="Dayton's Bluff">Dayton's Bluff</label> 
                    <input checked="true" type="checkbox" id="Payne/Phalen" value=5 @change="tableRefresh"/>
                        <label for="Payne/Phalen">Payne/Phalen</label> <br> 
                    <input checked="true" type="checkbox" id="North End" value=6 @change="tableRefresh"/>
                        <label for="North End">North End</label>
                    <input checked="true" type="checkbox" id="Thomas/Dale(Frogtown)" value=7 @change="tableRefresh"/>
                        <label for="Thomas/Dale(Frogtown)">Thomas/Dale(Frogtown)</label> <br>
                    <input checked="true" type="checkbox" id="Summit/University" value=8 @change="tableRefresh"/>
                        <label for="Summit/University">Summit/University</label>
                    <input checked="true" type="checkbox" id="West Seventh" value=9 @change="tableRefresh"/>
                        <label for="West Seventh">West Seventh</label>
                    <input checked="true" type="checkbox" id="Como" value=10 @change="tableRefresh"/>
                        <label for="Como">Como</label> <br>
                    <input checked="true" type="checkbox" id="Hamline/Midway" value=11 @change="tableRefresh"/>
                        <label for="Hamline/Midway">Hamline/Midway</label>
                    <input checked="true" type="checkbox" id="St. Anthony" value=12 @change="tableRefresh"/>
                        <label for="St. Anthony">St. Anthony</label>
                    <input checked="true" type="checkbox" id="Union Park" value=13 @change="tableRefresh"/>
                        <label for="Union Park">Union Park</label> <br>
                    <input checked="true" type="checkbox" id="Macalester-Groveland" value=14 @change="tableRefresh"/>
                        <label for="Macalester-Groveland">Macalester-Groveland</label>
                    <input checked="true" type="checkbox" id="Highland" value=15 @change="tableRefresh"/>
                        <label for="Highland">Highland</label>
                    <input checked="true" type="checkbox" id="Capitol River" value=16 @change="tableRefresh"/>
                        <label for="Capitol River">Capitol River</label>
                </div>
                <div class="large-2">
                    <strong>date_range</strong><br>
                    <select name="start_date" @change="tableRefresh">
                        <option value="" disabled selected> Start</option>
                    </select> 
                    <select name="end_date">
                        <option value="" disabled selected>End</option>
                    </select>       
                    
                </div>
                <div class="large-2">
                    <strong>max incidents</strong><br>
                    <select name="max_incidents" @change="tableRefresh">
                        <option value="" disabled selected>Select</option>
                        <option value="10">10</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
                    </select>  
                </div>
            </div>
        </div>
        <table id="crime-list" :key="refresh">
            <tr> 
                <th v-for="head in table_headings"> {{ head }} </th>
            </tr>
            <tr v-for="incident in crime_table"> 
                <td> {{ incident.case_number }} </td>
                <td> {{ incident.date }} </td>
                <td> {{ incident.time }} </td>
                <td> {{ incident.incident_type }} </td>
                <td> {{ incident.police_grid }} </td>
                <td> {{ incident.neighborhood_name }} </td>
                <td> {{ incident.block }} </td>
            </tr>
        </table>
    </div>
</template>

<style>
#rest-dialog {
    width: 20rem;
    margin-top: 10rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
    margin-bottom: 1rem;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}

.coord-input {
    width: 20rem;
}

.coord-button {
    width: 7.5rem;
}

.space-left {
    margin-left: 1rem;
}

table, th, td {
    margin-top: 1rem;
    border: 1.5px solid black;
    text-align: center;
}

</style>
