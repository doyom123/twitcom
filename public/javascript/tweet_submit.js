$(function() {

	// Refresh Tweet List
	function refresh() {
		var url = "/refresh";
		$.get(url, function( data ) {
			console.log(data);
			$("#tweet_list").html(data);
		});
		console.log("refresh done");
	}

	$("#submit_button").click(function() {
		$(".tweet_submit_form").slideDown("fast");
		$("#submit_button").css("background-color", "#eeeeee");
	});

	$("#form_cancel_btn").click(function() {
		$(".tweet_submit_form").slideUp("fast", function() {
			$("#submit_button").css("background-color", "#fdfdfd");
		});
	});

	$('#form_submit_btn').one("click", function() {
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

	// $('#refresh_button').one("click", function() {
	// 	refresh();
	// });

	$('#refresh_button').on('click', function() {
		refresh();
	});


	// timer
	function showTime() {
		var d = new Date();
		d.setHours(d.getHours() + 1);
		d.setMinutes(0)
		d.setSeconds(0);
		var timespan = countdown(d);
		$('#timer_min').html(timespan.minutes);
		$('#timer_sec').html(timespan.seconds);

	}

	var timer = setInterval(showTime, 500);


});
