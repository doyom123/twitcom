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
		var now = moment();
		var next_hour = moment().add(1, 'h').startOf('hour');
		var duration = moment.duration(next_hour.diff(now));
		var sec = duration.as('seconds').toFixed(2);
		var min = duration.as('minutes').toFixed(0);
		var s = (sec % 60).toFixed(0);
		if(min < 10) {
			min = '0' + min;
		}
		if(s < 10) {
			s = '0' + s;
		}

		$('#timer_min').html(min);
		$('#timer_sec').html(s);
	}

	var timer = setInterval(showTime, 500);


});
