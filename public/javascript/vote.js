// public/javascript/vote.js
$(function() {

	function refresh() {
		var url = "/refresh";
		$.get(url, function( data ) {
			// $(".tweet_list").html(data);
			$("#tweet_list").html(data);
		});
		console.log("refresh done");
	}

	$('body').on('click', '.vote_button', function() {
		console.log("vote_button clicked");
		var id = $(this).attr('id');
		var url = "/vote/"+id;
		var success = function() {
			console.log("VOTE SUCCESS");
			// location.reload();
			refresh();
		}
		$.post(url, success);
		
	});

	$('.neg_button').on('click', function() {
		var id = $(this).attr('id');
		var url = "vote/"+id;
		var success = function() {
			console.log("NEG SUCCESS");
			// location.reload();
		}
		$.post(url, success);
	});
});