import React from 'react'
import axios from 'axios'
import { debounce } from './Debounce'


export class Map extends React.Component {
	constructor() {
		super()
		this.state = {
			locations: false,
			activeLocations: null,
			active: null,
			loaded:false
		}
	}
	componentDidMount() {
		axios.get( this.props.baseUrl + '/wp-json/wp/v2/retailers?per_page=5000').then( res => this.setState({locations: res.data}))
	}
	componentWillUnmount() {
		this.refs.mapWrap.classList.add('hidden')
	}
	activeUpdate(key) {
		this.state.active != key ? this.setState({active: key}) : null
	}
	updatePlacesNearMe(payload) {
		payload.sort(function(a, b){
			return parseFloat(a.distance_from_center) - parseFloat(b.distance_from_center);
		})
		this.setState({
			activeLocations: payload
		})
	}
	mapReveal() {
		let container = this.refs.mapWrap
		let tl = new TimelineMax({onStart: () => {
				container.classList.add('open')
			}, onComplete: () => {
				container.classList.remove('will-change-sp')
			}})

		this.refs.mapWrap.classList.add('open')

		this.setState({
			loaded: true
		})
	}
	render() {
		return (
			<div className="flex mapWrapper will-change-sp" ref="mapWrap">
				<LocationSidebar
					locations={ this.state.activeLocations ? this.state.activeLocations : null }
					active={ this.state.active }
					activeUpdate={ (k) => this.activeUpdate(k) }
					/>
				<GoogleMap
					center={ this.props.location }
					zoom={ this.props.zoom }
					locations={ this.state.locations ? this.state.locations : null }
					active={ this.state.active }
					activeUpdate={ (k) => this.activeUpdate(k) }
					updatePlacesNearMe={ (p) => this.updatePlacesNearMe(p) }
					init={ () => this.mapReveal() }
					loaded={ this.state.loaded }
					/>
			</div>
		)
	}
}

export class GoogleMap extends React.Component {
		constructor() {
			super()
			this.state = {
				init: false,
				opened: false,
				info: [],
				mark: [],
				activeMarkers: [],
				center: null,
				repositioned: false
			}
		}

		componentDidUpdate( nextProps ) {
			!this.state.init && this.props.center ?
				this.mapInitialize() : null

			// Reset ALL active Markers on new Map Lookup
			this.state.init && this.props.center != nextProps.center ?
				(this.setState({activeMarkers: []}), this.mapRecenter()) : null

			// Verify this is not causing loop
			this.state.center != this.props.center ?
				this.state.center = this.props.center : null

			this.props.active != nextProps.active ? this.state.repositioned = false : null

			this.state.info && this.props.active && !this.state.repositioned ?
				(this.state.info[this.props.active].open(this.map, this.state.mark[this.props.active]),
				this.map.panTo(this.state.mark[this.props.active].getPosition()),
				this.setActiveMarker(this.state.info[this.props.active], this.props.active))
			: null
		}


		mapInitialize() {

			let comp = this
			let iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
			let mapOptions = {
				zoom: this.props.zoom,
				scrollwheel: false,
				streetViewControl: false,
				center: new google.maps.LatLng(this.props.center.location.lat, this.props.center.location.lng),
				styles:[{"featureType":"water","elementType":"geometry","stylers":[{"color":"#e9e9e9"},{"lightness":17}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":20}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#ffffff"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":16}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":21}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#dedede"},{"lightness":21}]},{"elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#ffffff"},{"lightness":16}]},{"elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#333333"},{"lightness":40}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#f2f2f2"},{"lightness":19}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#fefefe"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#fefefe"},{"lightness":17},{"weight":1.2}]}]
			}

			this.map = new google.maps.Map(this.refs.map, mapOptions)

			let myTitle = document.createElement('h1')
			myTitle.id = "words"
			let myTextDiv = document.createElement('div')
			myTextDiv.appendChild(myTitle)

			this.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(myTextDiv)

			this.props.locations.map( (loc, key) => {
				let lat = parseFloat(loc.acf.latitude)
				let lon = parseFloat(loc.acf.longitude)
				let ttl = loc.title.rendered
				let pos = new google.maps.LatLng(lat, lon)

				let addressLink = 'https://www.google.com/maps/dir//' + loc.acf.address_line_1 +' '+ loc.acf.city +' '+ loc.acf.state +' '+ loc.acf.zip
				let address = '<p class="bold">' + loc.acf.address_line_1 + '</p>' + '<p>' + loc.acf.city + ', ' + loc.acf.state + ' ' +  loc.acf.zip + '</p>'
				let phone = '<p><a href="tel:' + loc.acf.phone + '">'  + loc.acf.phone + '</a></p>'

				let string = '<div class="infoBlock">' + '<p>' + loc.title.rendered + '</p>' + '<hr>' + '<a href="'+addressLink+'" target="_blank">' +  address + '</a>' + phone + '<br/><p><a href="'+addressLink+'" target="_blank" class="getDir">' + 'Get Directions' + '</a></p></div>'

				let info = new google.maps.InfoWindow({
					content: string,
    				infoBoxClearance: new google.maps.Size(1, 1)
				})
				let mark = new google.maps.Marker({
					position: pos,
					map: this.map,
					icon: '/dist/assets/img/map-marker.png',
					animation: google.maps.Animation.DROP,
					title: ttl
				})

				this.state.mark.push(Object.assign(mark, loc))
				this.state.info.push(info)

				google.maps.event.addListener(mark, 'click', () => {
					info.open(this.map, mark)
					this.setActiveMarker(info, key)
				})
				google.maps.event.addListener(info,'closeclick', () => {
				   this.state.opened.close()
				   this.state.repositioned = false
				   this.props.activeUpdate(null)
				})
			})

			let that = this

			google.maps.event.addListener(this.map, 'bounds_changed', debounce(function() {
				that.updateVisibleMarkers()
			}, 200) )

			// Reveal map and set State that map has initialized
			this.props.init()
			window.innerWidth < 1000 ? window.scrollTo(0,0) : null
			this.state.init = true
			this.refs.map.classList.add('open')
		}
		mapRecenter() {
			let lat = this.props.center.location.lat
			let lng = this.props.center.location.lng
			let center = new google.maps.LatLng(lat, lng)

			// Radius set based on select value * meters per mi
  			let circle = new google.maps.Circle({radius: (804.67 * parseInt(this.props.zoom)), center: center})
			// Set center based on input Return value
			this.map.setCenter(center)
			// Set zoom based on Circle
			this.map.fitBounds(circle.getBounds())

			console.log('== !!RECENTERED!! ==', circle, '\n', '== !!ZOOM!! ==', this.props.zoom )
		}
		updateVisibleMarkers() {
			let currentBound = this.map.getBounds()
			let center = new google.maps.LatLng(this.props.center.location.lat, this.props.center.location.lng)

			this.state.mark.map( (marker, key) => {
				let pos = marker.getPosition()
				if ( currentBound.contains(pos) ) {
					let markPos = marker.getPosition()
					let distance = google.maps.geometry.spherical.computeDistanceBetween(center, markPos)
					let markerInfo = Object.assign(marker, {markerIndex: key, distance_from_center: distance})

					// If Marker is already in active array skip it
					this.state.activeMarkers.indexOf(markerInfo) === -1 ? this.state.activeMarkers.push(markerInfo) : null
				}
			})
			this.props.updatePlacesNearMe(this.state.activeMarkers)
		}
		setActiveMarker(info, key) {
			let opened = this.state.opened
			opened && opened != info ? opened.close() : null
			this.state.opened = info
			this.state.repositioned = true

			this.props.activeUpdate(key)
		}
		render() {
			return (
				<div className="mapWrap">
					<div ref="map" style={{ 'height' : '100%', 'width' : '100%' }} >
					</div>

					{ !this.props.loaded && <div className="loader" style ={{ 'display' : this.state.imageLoaded ? 'none' : 'block', 'zIndex': 100 }}>
						<img src="../../dist/assets/img/loader.gif" />
					</div> }
				</div>
			)
		}
}

export class LocationSidebar extends React.Component {
		constructor() {
			super()
			this.state = {
				active: null,
				move: false
			}
		}
		componentDidUpdate() {
			this.state.active != this.props.active ? this.setState({active: this.props.active, move: true}) : this.state.move == true && this.props.active ? this.switchActive() : null
		}
		handleClick(key) {
			this.props.activeUpdate(key)
		}
		switchActive() {
			let active = this.refs.active
			let parent = active.parentNode
			let offset = active.offsetTop
			let height = active.clientHeight
			let parHeight = parent.clientHeight
			let st = active.parentNode.scrollTop
			let totalMax = st + parHeight - height
			let totalMin = parHeight

			// console.log('TMAX == ',totalMax,'\n','O == ', offset, '\n', 'TMIN ==',totalMin)
			if (totalMax < offset || (offset) < st ) {
				TweenMax.to(active.parentNode, 0.45, {scrollTo: {y: offset}})
			}

			this.state.move = false
		}
		render() {
			// const active = {'locationBlock', 'active'}
			return (
				<div className="locationWrap">
					{
						this.props.locations &&
						this.props.locations.map( (loc, key) => {
							return (
								<div className={  this.state.active == loc.markerIndex ? 'locationBlock active' : 'locationBlock' } key={ key } onClick={ () => this.handleClick(loc.markerIndex) } ref={ this.state.active == loc.markerIndex ? 'active' : null }>
									<p dangerouslySetInnerHTML={{ __html : loc.title.rendered }} />
									<hr />
									<p>{ loc.acf.address_line_1 }</p>
									<p>{ loc.acf.city }, { loc.acf.state + ' ' + loc.acf.zip }</p>
									<div className="distance">
										<p>{ Math.round((loc.distance_from_center / 1609.34) * 10) / 10 } mi</p>
									</div>
								</div>
							)
						})
					}
					{
						this.props.locations && this.props.locations.length == 0
						&&
							<div className="locationBlock">
								<p>There are currently no available results, please try a different location.</p>
							</div>
					}
				</div>
			)
		}
}
