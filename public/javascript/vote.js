// public/javascript/vote.js
$(function() {
	$('.vote_button').on('click', function() {
		var id = $(this).attr('id');
		var url = "/vote/"+id;
		var success = function() {
			console.log("VOTE SUCCESS");
			location.reload();
		}
		$.post(url, success);
	});

	$('.neg_button').on('click', function() {
		var id = $(this).attr('id');
		var url = "vote/"+id;
		var success = function() {
			console.log("NEG SUCCESS");
			location.reload();
		}
		$.post(url, success);
	});
});