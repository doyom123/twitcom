$(function() {
	$("#submit_button").click(function() {
		$("#tweet-submit").css("display", "block");
	});

	$("#form_cancel").click(function() {
		$("#tweet-submit").css("display", "none");
	});

	$('#form_submit').click(function() {
		var id = $(this).attr('id');
		var url = "/tweets/submit"
		var text = $("#form_body").val();

		if(text.length != 0) {
			$.post(url, { body : text }, function() {
				alert('SUBMITTED');
				location.reload();
			});
		} 
	});

	$('#refresh').click(function() {
		var url = "/refresh";
		$.get(url, function( data ) {
			$('#tweet_list').html(data);
		});
	});

	// timer
	function showTime() {
		var now = moment.tz("Europe/Dublin").format("LTS");
		$('#timer').html(now);
		var now2 = new Date().toString();
		$('#timer2').html(now2);
	}

	var timer = setInterval(showTime, 500);


});
