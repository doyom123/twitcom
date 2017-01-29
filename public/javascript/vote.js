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
		var id = $(this).attr('id');
		var el2 = $('#' + id);
		el2.prop("disabled", true);

		var url = "/vote/"+id;
		var color = el2.css('background-color');
		if(color == 'rgb(238, 238, 238)' || color == 'rgb(253, 253, 253)') {
			var text = el2.prev().text();
			var newText = parseInt(text) + 1;
			el2.prev().text(newText.toString());
			el2.css({
				backgroundColor: '#ED5780'
			});
		} else {
			var text = el2.prev().text();
			var newText = parseInt(text) - 1;
			el2.prev().text(newText.toString());
			el2.css({
				backgroundColor: '#fdfdfd'
			});
		}
		var success = function() {
			console.log("VOTE SUCCESS");
			el2.prop("disabled", false);

		}
		var error = function() {
			console.log("VOTE ERROR");
		}
		$.post(url, success);
		
	});

	$('body').on('click', '.neg_button', function() {
		console.log("neg_button_clicked");
		var id = $(this).attr('id');
		var url = "/vote_neg/"+id;
		var success = function() {
			console.log("NEG SUCCESS");
			refresh();
		}
		$.post(url, success);
	});
});