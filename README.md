angular-rbac
============

A simple version of RBAC for angular that can be easily integrated with any angular application and any backend.
This module consist from 2 parts: **$rbac** service and directive **allow**.

Task of that module is quite simple - *request backend for permission(boolean) for AuthItem (any string).* 
Because we, probably, don't want to spam backend with alot of small request to check permissions, some optimization is required.
That's why was born such module (and because i need some interesting task to learn new technology/framework - in my case, it's angular)

At this module, each permission has 3 state: **undefined**, **true** and **false**. **undefined** means that checking was never requested. So that's additional $digest for watches (if that's important information for you)!

P.S.: Task of this module - easily to add posibilities to check permission without any RBAC configuration at client-side, let's
backend do all dirty work. Moving/duplicating any real RBAC/ACL at client side is very bad idea, so in real world, we need only
some optimizations in our api-centric/ria/web-application. 

### Usage

As already was mentioned, there are 2 parts: *directive* **allow** and *service* **$rbac**. You can't use directive without service, but of course you can use service without directive.

Main task of directive to optimize our permissions checking at templates, because most time at real application there will be alot of such checking and we would like to request server only once - somewhere after 'compile' phase.
So yes, not matter how many directives will be used to check permission, only one request will be sent to server for checking.
Also not matter how many times you will ask to check same permission, that permission will be checked only once.

So let's rock-n-roll.

	<button allow="Guest">Login</button>
	<button allow="User">Update Profile</button>
	...
	<ul ng-repeat="user in users">
		<li>{{user.name}} <button allow="Admin">Update</button></li>
	</ul>

All our **allow** directives enqueue service to check for permissions. At this example, only one request for checking will be sent: 
> ["Guest", "User", "Admin"]

And server must respond with something like: 
> { Guest: true, User: false, Admin: false }

Service caching locally any checking, so till application will be reloaded (page reload) or reset() method will be called - state of permissions will be stored.
Of course, there is no any syncronization with server, so in case if state was changed at server that doesn't mean that client will get this update immediately. 
You will need re-request server for state. To implement logic based on this module - is your task and in your hands.

Ok, everything is clear with directives, but what about controllers? Can we use it here? Sure, let's see:
```javascript
	app.controller('pageController', ['$scope', '$rbac' , function($scope, $rbac) {

		$rbac.checkAccess(['User', 'Admin']).then(function(){
			//we got 'response' from server for 2 permissions 'User' and 'Admin'
	    
			if($rbac.allow('User'))
				alert('Hello, user!');
	        
			if(!($rbac.allow('Admin')))
				alert('You are not admin!');
		});

		$rbac.checkAccess(['Guest', 'Admin']).then(function() {
			//...
		});
 
	}]);
```
That's how you can use service **$rbac** at controllers. 

Btw, how many requests will be sent to server at last example and what permissions will be checked? Ok, ok....two request will be sent to server: 
> ["User", "Admin"] and ["Guest"]. 

Why only one checking at last request? That's because that checking was already requested.

N.B.: **$rbac.allow()** is not requesting permission check, it only returns current state of that permission (**true*/**false**/**undefined**).



### API
Service $rbac has some useful methods, let's look more closely

```javascript 
/**
* Direct checking for permissions. Can be executed from controllers.
* @param {(string|string[])} authItems - AuthItem or array of AuthItems to check for permissions
* @returns {promise}
*/
function checkAccess(authItems)

/**
* Put AuthItem in queue for checking of permission. Can be used from directives. 
* Checking will be delayed till next $digest.
* @param {string} authItem - AuthItem to check for permission
*/
function enqueueChecking(authItem)

/**
* Return current state of permission for AuthItem.
* @param {string} authItem - AuthItem to get
* @returns {(boolean|undefined)}
*/
function allow(authItem)

/**
* Grant permission for AuthItem. That's only local operation, that can be used after 
* some special tasks at client-side. No any server processing.
* @param {string} authItem - AuhItem to grant permission
*/
function grant(authItem)

/**
* Revoke permission for AuthItem. That's only local operation, that can be used after 
* some special tasks at client-side. No any server processing.
* @param {string} authItem - AuthItem to revoke permission
*/
function revoke(authItem)

/**
* Resets permissions that were locally stored.
* @param {[string|string[]]} authItems - AuthItems to reset permissions. If omit - reset all permissions
*/
function reset(authItems)
```

### Configuration
