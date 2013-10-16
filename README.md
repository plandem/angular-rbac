angular-rbac
============

A simple version of RBAC for angular that can be easily integrated with any angular application and any backend
This module consist from 2 parts: '$rbac' service and directive 'allow'.

Task of that module is quite simple - request backend for permission(boolean) for AuthItem (any string). 
Because we, probably, don't want to spam backend with alot of small request to check permissions, some optimizations is required.
That's why was born such module (and because i need some interesting task to learn new technology/framework - in my case, it's angular)

At this module, each permission has 3 state: 'undefined', 'true' and 'false'. 'undefined' means that checking was never requested. So that's additional $digest for watches (if that's important information for you)!

P.S.: Task of this module - easily to add posibilities to check permission without any RBAC configuration at client-side, let's
backend do all dirty work and because move/duplicate any real RBAC/ACL to client side is very bad idea, so in real world, we need only
some optimizations in our api-centric/ria/web-application. 

Usage
=====

As already was mentioned, there are 2 parts: directive ('allow') and service ('$rbac'). You can't use directive without service, but of course you can use service without directive.

Main task of directive to optimize our permissions checking at templates, because most time at real application there will be alot of such checking and we would like to request server only once - somewhere after 'compile' phase.
So yes, not matter how many directives will be used to check permission, only once request will be sent to server for checking.
Also not matter how many times you will ask to check same permission, that permission will be checked only once.

So let's rock-n-roll.

<button allow="Guest">Login</button>
<button allow="User">Update Profile</button>
...
<ul ng-repeat="user in users">
	<li>{{user.name}} <button allow="Admin">Update</button></li>
</ul>

All our 'allow' directives enqueue service to check for permissions. At this example, only one request for checking will be send: ["Guest", "User", "Admin"]
And server must respond with: { Guest: true, User: false, Admin: false }, for example.

Service caching locally any checking, so till application will be reloaded (page reload) or reset() method will be called - state of permissions will be stored.
Of course, there is no any syncronization with server, so in case if state was changed at server that doesn't mean that client will get this update imideatly. 
You will need re-request server for state. To implement logic based on this module - is your task and in your hands.

Ok, everything is clear with directives, but what about controllers? Can we use it here? Sure, let's see:

app.controller('pageController', ['$scope', '$rbac' , function($scope, $rbac) {

	$rbac.checkAccess(['User', 'Admin']).then(function(response){
		//we got 'response' from server for 2 permissions 'User' and 'Admin'
	    
		if(response['User'])
			alert('Hello, user!');
	        
		if(!(response['Admin']))
			alert('You are not admin!');
	});

	$rbac.checkAccess(['Guest', 'Admin']).then(function(response) {
		//...
	});
 
}]);

That's how you can use service at controllers. Btw, how many requests will be send to server at last example and what permissions will be checked?

Ok, ok....only request will be sent to server: ["User", "Admin", "Guest"]. WTF?! Why only one and combined? That's because 
of scopes/$digest. Service monitor any requests during one scope, combine and send as one request.

So our previous example, is actually like:

app.controller('pageController', ['$scope', '$rbac' , function($scope, $rbac) {

	$rbac.checkAccess(['User', 'Admin', 'Guest']).then(function(response){
		//we got 'response' from server for 3 permissions 'User', 'Admin' and 'Guest'
	    
		if(response['User'])
			alert('Hello, user!');
	        
		if(!(response['Admin']))
			alert('You are not admin!');
	});

}]);

WTF?!?! How to make how we wanted it before? Well, checkAcess returns 'promise' object, so you need to do it like:

app.controller('pageController', ['$scope', '$rbac' , function($scope, $rbac) {

	$rbac.checkAccess(['User', 'Admin']).then(function(response){
		//we got 'response' from server for 2 permissions 'User' and 'Admin'
	    
		if(response['User'])
			alert('Hello, user!');
	        
		if(!(response['Admin']))
			alert('You are not admin!');
	        
		$rbac.checkAccess(['Guest', 'Admin']).then(function(response) {
			//...
		});   
	});

}]);

In that case two requests to server will be send. First will ask for ['User', 'Admin'] and second will ask for ['Guest']

API
===
To be continue...
