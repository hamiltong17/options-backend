async function placeOptionOrder({
	symbol,
	option_symbol,
	quantity = 1,
	side = 'buy to open',  // or 'sell to close' 
	order_type = 'market', // or 'limit'
	duration = 'day',
	price = null // required if order_type is 'limit'
}) {

   try {
        
        const response = await axios.post(
		`https://api.tradier.com/v1/accounts/6YB59224/orders`,
		new URLSearchParams({
		     class: 'option' ,
		     symbol,
		     option_symbol,
		     side,
		     quantity,
		     type: order_type,
		     duration,
		     . . .(price && order_type === 'limit' ? { price } : {}),
		}),
	        {
			headers: {
			     Authorization: `Bearer ${gfKgLYNxBCRMFgXDiKZBHg1SKeBJ}`,
			     Accept: 'application/json',
			      'Content-Type': 'application/x-www-form-urlencoded',
			},
		}
	);

    console.log('Order Response:' , response.data);
    return response.data;
}  catch (error) {
     console.error('Error placing order:', error.response?.data || error.message);
     return null;
  }

 }
