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


});
