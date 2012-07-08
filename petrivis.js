function activate_transition(net, marking, tname) {
    // Copy current marking
    var post_marking = {}
    for(var pname in marking) {
	post_marking[pname] = marking[pname];
    }

    // Collect input places
    var input_places = [];
    for(var i = 0; i < net.place_transition.length; i++) {
	if(net.place_transition[i][1] === tname) {
	    input_places.push(net.place_transition[i][0]);
	}
    }
    
    // Check that input places are all marked
    // Note: If there are no input places, transition is always firable
    for(var i = 0; i < input_places.length; i++) {
	if(marking[input_places[i]] < 1) {
	    // Failed activation precondition, return marking unmodified
	    return post_marking;
	}	
    }

    // Collect output places
    var output_places = [];
    for(var i = 0; i < net.transition_place.length; i++) {
	if(net.transition_place[i][0] === tname) {
	    output_places.push(net.transition_place[i][1]);
	}
    }

    // Decrement input place token count
    for(var i = 0; i < input_places.length; i++) {
	var pname = input_places[i];
	post_marking[pname] = Math.max(post_marking[pname] - 1, 0);
    }
	
    // Increment output place token count
    for(var i = 0; i < output_places.length; i++) {
	var pname = output_places[i];
	if(pname in post_marking) {
	    post_marking[pname] += 1;
	} else {
	    post_marking[pname] = 1;
	}
    }

    return post_marking;
}

function PlaceElement(visualization, name, place) {
    this.vis = visualization;
    this.name = name;
    this.p = place;
    this.circle = this.vis.paper.circle(this.p.x, this.p.y, this.vis.pr);
    this.circle.attr({fill: "#fff"});
    this.tokens = this.vis.paper.set();
    this.name_text = this.vis.paper.text(this.p.x, this.p.y + (this.vis.pr / 2) + 2, this.name);
}

PlaceElement.prototype = {
    'set_n_tokens' : function(n) {
	this.tokens.forEach(function(e) {
	    e.remove();
	});
	this.tokens.clear();
	// For now, manually handle n <= 3
	switch(n) {
	case 0:
	    break;
	case 1:
	    this.tokens.push(this.vis.paper.circle(this.p.x, this.p.y, 4));
	    break;
	case 2:
	    this.tokens.push(this.vis.paper.circle(this.p.x - 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x + 7, this.p.y, 4));
	    break;
	case 3:
	    this.tokens.push(this.vis.paper.circle(this.p.x - 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x + 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x, this.p.y - 14, 4));
	    break;
	default:
	    var number_text = this.vis.paper.text(this.p.x, this.p.y, n.toString());
	    number_text.attr({'font-size' : 14});
	    this.tokens.push(number_text);
	}
	this.tokens.attr({fill: "black"});
    }
};


function TransitionElement(vis, name, transition) {
    this.vis = vis;
    this.name = name;
    this.t = transition;
    var th = vis.th;
    var tw = vis.tw;
    if(this.t.orientation === 1) {
	this.rect = vis.paper.rect(this.t.x - tw/2, this.t.y - th/2, tw, th);
	this.name_text = vis.paper.text(this.t.x - tw/2 + 5, this.t.y, name);
    } else {
	this.rect = vis.paper.rect(this.t.x - th/2, this.t.y - tw/2, th, tw);
	this.name_text = vis.paper.text(this.t.x, this.t.y - tw/2 + 5, name);
	this.name_text.transform('r90');
    }
    this.rect.attr({fill: "white"});
    this.name_text.attr({'text-anchor' : 'start'});
    var activation_callback = function () {
	vis.update_marking(activate_transition(vis.net, vis.marking, name));
    };
    this.rect.click(activation_callback);
    this.name_text.click(activation_callback);
}

TransitionElement.prototype = {
};

function PetriNetVisualization(paper, net, marking) {
    this.net = net;
    this.marking = marking;
    this.paper = paper;
    
    // Create place circles
    this.place_elements = {};
    for(var name in net.places) {
	var p = net.places[name];
	this.place_elements[name] = new PlaceElement(this, name, p);
    }
    
    // Create transition boxes
    this.transition_elements = {};
    for(var name in net.transitions) {
	var t = net.transitions[name];
	//this.transition_elements[name] = this.create_transition(name, t);
	this.transition_elements[name] = new TransitionElement(this, name, t);
    }

    // Create links
    this.link_elements = [];
    for (var i=0; i < net.place_transition.length; i++) {
	var pt = net.place_transition[i];
	this.link_elements.push(this.create_link(net.places[pt[0]], net.transitions[pt[1]], true));
    }
    for (var i=0; i < net.transition_place.length; i++) {
	var tp = net.transition_place[i];
	this.link_elements.push(this.create_link(net.places[tp[1]], net.transitions[tp[0]], false));
    }

    this.update_marking(marking);
}

PetriNetVisualization.prototype = {
    "tw" : 50,
    "th" : 20,
    "pr" : 25,    
    "create_link" : function(p, t, forwardp) {
	var elems = {};
	var a, b;

	// Pick a connection point on the transition box
	if(t.orientation === 1) {
	    // Horizontal
	    if(p.y > t.y) {
		b = [t.x, t.y + this.th/2];
	    } else {
		b = [t.x, t.y - this.th/2];
	    }
	}
	else {
	    // Vertical
	    if(p.x > t.x) {
		b = [t.x + this.th/2, t.y];
	    } else {
		b = [t.x - this.th/2, t.y];
	    }
	}
	
	var theta = Math.atan2(b[1] - p.y, b[0] - p.x);
	a = [p.x + this.pr * Math.cos(theta), p.y + this.pr * Math.sin(theta)];
	var path_string;
	path_string = line_cmd(a[0], a[1], b[0], b[1]);
	elems.line = this.paper.path(path_string);
	elems.line.toBack();
	
	// Add arrow
	var mx = (a[0] + b[0]) / 2;
	var my = (a[1] + b[1]) / 2;
	var arrow_string = '';
	if(forwardp) {
	    arrow_string += line_cmd(mx, my, mx + 5 * Math.cos(theta + 3 * Math.PI/4), my + 5 * Math.sin(theta + 3 * Math.PI/4));
	    arrow_string += line_cmd(mx, my, mx + 5 * Math.cos(theta - 3 * Math.PI/4), my + 5 * Math.sin(theta - 3 * Math.PI/4));
	} else {
	    arrow_string += line_cmd(mx, my, mx - 5 * Math.cos(theta + 3 * Math.PI/4), my - 5 * Math.sin(theta + 3 * Math.PI/4));
	    arrow_string += line_cmd(mx, my, mx - 5 * Math.cos(theta - 3 * Math.PI/4), my - 5 * Math.sin(theta - 3 * Math.PI/4));
	}
	elems.arrow = this.paper.path(arrow_string);
	return elems;
    },
    "update_marking" : function(marking) {
	this.marking = marking;
	for(var pname in this.net.places) {
	    if(pname in marking) {
		this.place_elements[pname].set_n_tokens(marking[pname]);
	    } else {
		this.place_elements[pname].set_n_tokens(0);
	    }
	}
    }
};



function line_cmd(x0, y0, x1, y1) {
    var cmd_str = 'M' + x0.toFixed() + ',' + y0.toFixed();
    cmd_str += 'L' + x1.toFixed() + ',' + y1.toFixed();
    return cmd_str;
}

window.onload = function() {
    var paper = new Raphael(document.getElementById('canvas_container'), 500, 500);
    var network_text = document.getElementById("network_text");
    var marking_text = document.getElementById("marking_text");
    var eval_button = document.getElementById("eval_button");
    eval_button.onclick = function () {
	var network = JSON.parse(network_text.value);
	var marking = JSON.parse(marking_text.value);
	paper.clear();
	var vis = new PetriNetVisualization(paper, network, marking);
    };
    var network = JSON.parse(network_text.value);
    var marking = JSON.parse(marking_text.value);
    var vis = new PetriNetVisualization(paper, network, marking);
};
