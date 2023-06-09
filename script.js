L.mapquest.key = 'IFutcz97fDjINJ1QeUpcmgVDzFLIDfex';
let apiKey = 'b2aaa7561cc145a5b412d187b054ba79'
let $darkMode = $('#darkmode')
let $body = $('body')
let $gridContainer = $('.grid-container')
let $h1 = $('h1')
let $h4 = $('h4')
let $navList = $('#nav-list')
let $greenBtn = $('#green-btn')
let $redBtn = $('#red-btn')
let $orangeBtn = $('#orange-btn')
let $blueBtn = $('#blue-btn')
let $purpleBtn = $('#purple-btn')
let $trainList = $('#train-list')
let $leftContainer = $('.left-container')
let $trainCount = $('#train-count')
let $rightContainer = $('.right-container')
let $inputBar = $('#input-bar')
let $submit = $('#submit')
let $map = $('#map')
let $footer = $('footer')
let $github = $('#github')

// Add event listener to darkmode button to toggle on/off dark mode properties
let darkMode = false;
$darkMode.on('click', () => {
    if (darkMode) {
        $body.css("background-color", "white")
        $gridContainer.css("background-color", "#F2F3F5")
        $h4.css("color", "black")
        $trainCount.css("color", "black")
        $footer.css("color", "black")
        $darkMode.css("background-color", "#121212")
        $darkMode.css("color", "white")
        $darkMode.text("Dark Mode")
        $github.attr("src", "images/github.png")
        darkMode = !darkMode
    } else {
        $body.css("background-color", "#121212")
        $gridContainer.css("background-color", "#121212")
        $h4.css("color", "white")
        $trainCount.css("color", "white")
        $footer.css("color", "white")
        $darkMode.css("background-color", "white")
        $darkMode.css("color", "black")
        $darkMode.text("Light Mode")
        $github.attr("src", "images/github_white.png")
        darkMode = !darkMode
    }
})

// Initialize map settings and render map
let map;
let locationArr = []
let myIcon = L.icon({
    iconUrl: 'images/gl.png',
    iconSize:[25,25]
})
function renderMap() {
    map = L.mapquest.map('map', {
        center: [42.3554334, -71.060511],
        layers: L.mapquest.tileLayer('map'),
        zoom: 13
        })
        map.addControl(L.mapquest.control())
}
renderMap()

// Add event listener that resets the page when clicking on the H1 element at the top of the page
$h1.on('click', () => {
    locationArr = []
    $greenBtn.click()
})

// Add event listener for the nav bar elements that correspond to train colors. Reset and re-render map and train elements.
$navList.on('click', 'button', async function() {
    map.remove()
    renderMap()
    $trainList.empty()
    plotLocationArr()
    let value = $(this).prop("value")
    let routeFilter = $(this).attr("route")
    let response = await axios.get(`https://api-v3.mbta.com/vehicles?api_key=${apiKey}&filter[route]=${routeFilter}`)
    parseTrainData(response, value)
    renderStopMarkers(routeFilter)
    renderPolyline(routeFilter, value)
})

// Add event listener to individual train buttons. On click, will center the map location of train selected
$trainList.on('click', 'button', function() {
    let lat = $(this).attr("lat")
    let lon = $(this).attr("lon")
    map.setView([lat,lon], 16)
    map.panTo([lat,lon], 16)
})

// Function that destructures and assigns train data to previously declared variables
async function parseTrainData(response, value) {
    $trainCount.text("")
    let data = await response.data.data
    for (const train of data) {
        let id = train.id
        let directionId = train.attributes.direction_id
        let routeId = train.relationships.route.data.id
        let stopId = train.relationships.stop?.data?.id
        let stopName = await getStopName(stopId)
        let current_status = train.attributes.current_status
        let label = train.attributes.label
        let lat = train.attributes.latitude
        let lon = train.attributes.longitude
        let directionName = await getDirectionName(directionId, routeId)
        let prediction = ''
        let status = ''
        switch (current_status) {
            case 'STOPPED_AT':
                status += "Stopped At"
                break
            case 'INCOMING_AT':
                status += "Arriving At"
                break
            case 'IN_TRANSIT_TO':
                status += "In Transit To"
                let minutes = await getPrediction(stopId, id)
                if (minutes == 1) {
                    prediction = `Arriving in ${minutes} minute.`
                } else if (minutes > 1) {
                    prediction = `Arriving in ${minutes} minutes.`
                }
                break
            default:
                return
        }
        if (value == 'purple') {
            L.marker([lat,lon], {icon: L.icon({iconUrl: `images/CR.png`, iconSize:[25,25]})}).addTo(map).bindPopup(`${label} ${directionName}</br>${status} ${stopName}</br>${prediction}`)
            $trainList.append(`<li><button class="train-btn ${value}" label="${label}" lat="${lat}" lon="${lon}">${label} ${directionName}</br>${status}</br>${stopName}</br>${prediction}</button></li>`)
        } else {
            L.marker([lat,lon], {icon: L.icon({iconUrl: `images/${routeId}.png`, iconSize:[25,25]})}).addTo(map).bindPopup(`${label} ${directionName}bound</br>${status} ${stopName}</br>${prediction}`)
            $trainList.append(`<li><button class="train-btn ${value}" label="${label}" lat="${lat}" lon="${lon}">${label} ${directionName}bound</br>${status}</br>${stopName}</br>${prediction}</button></li>`)
        }
    }
    $trainCount.text(`${$trainList.children().length} Active Trains`)
}

// Function that queries the MBTA API for prediction information, and calculates time difference in minutes
async function getPrediction(stopId, id) {
    const response = await axios.get(`https://api-v3.mbta.com/predictions?api_key=${apiKey}&filter[stop]=${stopId}`)
    const data = response.data.data
    for (const prediction of data) {
        try {
            if (prediction.relationships.vehicle.data.id == id) {
                let arrivalTime = prediction.attributes.arrival_time
                let arrival = new Date(arrivalTime).getTime()
                let now = new Date().getTime()
                let minutesToArrival = Math.round((arrival-now) / 60000)
                return Math.round(minutesToArrival)
            } else {
                return
            }
        } catch (e) {
            console.log(e)
        }

    }
}

// Function that retrieves direction name when given directionId and routeId as arguments
async function getDirectionName(directionId, routeId) {
    let response = await axios.get(`https://api-v3.mbta.com/routes?api_key=${apiKey}&filter[id]=${routeId}&filter[direction_id]=${directionId}`)
    return response.data.data[0].attributes.direction_names[directionId]
}

// Function that retrieves stop name when given stop id as an argument
async function getStopName(stopId) {
    if (stopId == "Union Square-01" || stopId == "Union Square-02") {
        return "Union Square"
    } else if (stopId == undefined) {
        return ''
    } else {
        let response = await axios.get(`https://api-v3.mbta.com/stops/${stopId}?api_key=${apiKey}`)
        return response.data.data.attributes.name
    }
}

// Function to retrieve stop information, place markers for each stop
async function renderStopMarkers(routeFilter) {
    const response = await axios.get(`https://api-v3.mbta.com/stops?api_key=${apiKey}&filter[route]=${routeFilter}`)
    const data = response.data.data
    for (const stop of data) {
       let lat = stop.attributes.latitude
       let lon = stop.attributes.longitude
       let name = stop.attributes.name
       L.marker([lat,lon], {icon: L.icon({iconUrl: `images/circle.png`, iconSize:[10,10]}), zIndexOffset: -100}).addTo(map).bindPopup(`${name}`)
    }
}

// Function to retrieve shapes data from API, call decode function to decode the raw data and plot it onto map
async function renderPolyline(routeFilter, value) {
    const response = await axios.get(`https://api-v3.mbta.com/shapes?api_key=${apiKey}&filter[route]=${routeFilter}`)
    const data = response.data.data
    let latlngs = []
    for (const i in data) {
        let polyraw = data[i].attributes.polyline
        latlngs.push(decode(polyraw))
    }
    var polyline = L.polyline(latlngs, {color: `${value}`}).addTo(map)
    map.fitBounds(polyline.getBounds())
}

// I found this function online that someone wrote to decode Google's Encoded Polyline Algorithm Format
// https://gist.github.com/ismaels/6636986
// Aside from paying for the Google Maps API, there was no other way to decode the decoded shapes data from API
function decode(encoded){
    var points = []
    var index = 0, len = encoded.length;
    var lat = 0, lng = 0;
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
    b = encoded.charAt(index++).charCodeAt(0) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
             } while (b >= 0x20);
    var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
     do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
    } while (b >= 0x20);
     var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
     lng += dlng;
     points.push([( lat / 1E5),( lng / 1E5)])  
  }
  return points
}

// Event listener for the enter key on input element, call handlesubmit function
$inputBar.on('keydown', (e) => {
    if (e.keyCode == 13) {
        handleSubmit()
    }
})

// Event listener for submit button, call handlesubmit function
$submit.on('click', () => {
    handleSubmit()
})

// Function to call mapquest API with input string, extract coordinates from response and add marker and push to location arr
async function handleSubmit() {
    let value = $inputBar.prop("value")
    if (!value){ return }
    let response = await axios.get(`https://www.mapquestapi.com/geocoding/v1/address?key=${L.mapquest.key}&location=${value}`)
    let lat = response.data.results[0].locations[0].latLng.lat
    let lng = response.data.results[0].locations[0].latLng.lng
    L.marker([lat,lng]).addTo(map).bindPopup(`${value}</br>Lat: ${lat}, Long: ${lng}`)
    map.setView([lat,lng], 16)
    locationArr.push([lat,lng,value])
    $inputBar.prop("value", '')
}

// Function to plot all coordinates in location array when selecting new lines
function plotLocationArr() {
    if (locationArr.length > 0) {
        for (latlng of locationArr) {
            L.marker(latlng).addTo(map).bindPopup(`${latlng[2]}</br>Lat: ${latlng[0]}, Long: ${latlng[1]}`)
        }
    }
}

$greenBtn.click()