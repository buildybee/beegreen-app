from flask import Flask, request, render_template_string

app = Flask(__name__)

# HTML content
HTML = '''
<!DOCTYPE html>
<html lang="en"><head>
<meta http-equiv="content-type" content="text/html; charset=UTF-8"><meta name="format-detection" content="telephone=no"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>Config ESP</title><script>function c(l){document.getElementById('s').value=l.getAttribute('data-ssid')||l.innerText||l.textContent;p = l.nextElementSibling.classList.contains('l');document.getElementById('p').disabled = !p;if(p)document.getElementById('p').focus();};function f() {var x = document.getElementById('p');x.type==='password'?x.type='text':x.type='password';}</script><style>.c,body{text-align:center;font-family:verdana}div,input,select{padding:5px;font-size:1em;margin:5px 0;box-sizing:border-box}input,button,select,.msg{border-radius:.3rem;width: 100%}input[type=radio],input[type=checkbox]{width:auto}button,input[type='button'],input[type='submit']{cursor:pointer;border:0;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%}input[type='file']{border:1px solid #1fa3ec}.wrap {text-align:left;display:inline-block;min-width:260px;max-width:500px}a{color:#000;font-weight:700;text-decoration:none}a:hover{color:#1fa3ec;text-decoration:underline}.q{height:16px;margin:0;padding:0 5px;text-align:right;min-width:38px;float:right}.q.q-0:after{background-position-x:0}.q.q-1:after{background-position-x:-16px}.q.q-2:after{background-position-x:-32px}.q.q-3:after{background-position-x:-48px}.q.q-4:after{background-position-x:-64px}.q.l:before{background-position-x:-80px;padding-right:5px}.ql .q{float:left}.q:after,.q:before{content:'';width:16px;height:16px;display:inline-block;background-repeat:no-repeat;background-position: 16px 0;background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAQCAMAAADeZIrLAAAAJFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADHJj5lAAAAC3RSTlMAIjN3iJmqu8zd7vF8pzcAAABsSURBVHja7Y1BCsAwCASNSVo3/v+/BUEiXnIoXkoX5jAQMxTHzK9cVSnvDxwD8bFx8PhZ9q8FmghXBhqA1faxk92PsxvRc2CCCFdhQCbRkLoAQ3q/wWUBqG35ZxtVzW4Ed6LngPyBU2CobdIDQ5oPWI5nCUwAAAAASUVORK5CYII=');}@media (-webkit-min-device-pixel-ratio: 2),(min-resolution: 192dpi){.q:before,.q:after {background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALwAAAAgCAMAAACfM+KhAAAALVBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAOrOgAAAADnRSTlMAESIzRGZ3iJmqu8zd7gKjCLQAAACmSURBVHgB7dDBCoMwEEXRmKlVY3L//3NLhyzqIqSUggy8uxnhCR5Mo8xLt+14aZ7wwgsvvPA/ofv9+4733IUXXngvb6XsFhO/VoC2RsSv9J7x8BnYLW+AjT56ud/uePMdb7IP8Bsc/e7h8Cfk912ghsNXWPpDC4hvN+D1560A1QPORyh84VKLjjdvfPFm++i9EWq0348XXnjhhT+4dIbCW+WjZim9AKk4UZMnnCEuAAAAAElFTkSuQmCC');background-size: 95px 16px;}}.msg{padding:20px;margin:20px 0;border:1px solid #eee;border-left-width:5px;border-left-color:#777}.msg h4{margin-top:0;margin-bottom:5px}.msg.P{border-left-color:#1fa3ec}.msg.P h4{color:#1fa3ec}.msg.D{border-left-color:#dc3630}.msg.D h4{color:#dc3630}.msg.S{border-left-color: #5cb85c}.msg.S h4{color: #5cb85c}dt{font-weight:bold}dd{margin:0;padding:0 0 0.5em 0;min-height:12px}td{vertical-align: top;}.h{display:none}button{transition: 0s opacity;transition-delay: 3s;transition-duration: 0s;cursor: pointer}button.D{background-color:#dc3630}button:active{opacity:50% !important;cursor:wait;transition-delay: 0s}body.invert{background-color:#060606;}body.invert,body.invert a,body.invert h1 {color:#fff;}body.invert .msg{color:#fff;background-color:#282828;border-top:1px solid #555;border-right:1px solid #555;border-bottom:1px solid #555;}body.invert .q[role=img]{-webkit-filter:invert(1);filter:invert(1);}:disabled {opacity: 0.5;}</style></head><body class="wifi"><div class="wrap"><div><a href="#p" onclick="c(this)" data-ssid="FTTH-sai">FTTH-sai</a><div role="img" aria-label="56%" title="56%" class="q q-3 l "></div><div class="q h">56%</div></div><div><a href="#p" onclick="c(this)" data-ssid="ZTE_2.4G_6eZrkS">ZTE_2.4G_6eZrkS</a><div role="img" aria-label="54%" title="54%" class="q q-3 l "></div><div class="q h">54%</div></div><div><a href="#p" onclick="c(this)" data-ssid="Airtel_emma_2795">Airtel_emma_2795</a><div role="img" aria-label="18%" title="18%" class="q q-2 l "></div><div class="q h">18%</div></div><br><form method="POST" action="wifisave"><label for="s">SSID</label><input id="s" name="s" maxlength="32" autocorrect="off" autocapitalize="none" placeholder=""><br><label for="p">Password</label><input id="p" name="p" maxlength="64" type="password" placeholder=""><input type="checkbox" id="showpass" onclick="f()"> <label for="showpass">Show Password</label><br><br><hr><br><label for="mqtt_server">MQTT Server</label><br><input id="mqtt_server" name="mqtt_server" maxlength="60">
<label for="mqtt_port">MQTT Port</label><br><input id="mqtt_port" name="mqtt_port" maxlength="4">
<label for="username">Username</label><br><input id="username" name="username" maxlength="32">
<label for="password">Password</label><br><input id="password" name="password" maxlength="32">
<br><br><button type="submit">Save</button></form><br><form action="/wifi?refresh=1" method="POST"><button name="refresh" value="1">Refresh</button></form><div class="msg">No AP set</div></div></body></html>
'''

@app.route('/')
def index():
    return render_template_string(HTML)

@app.route('/wifisave', methods=['POST'])
def wifisave():
    # Print form data to console
    print("Form Data Received:")
    print(f"SSID: {request.form.get('s')}")
    print(f"Password: {request.form.get('p')}")
    print(f"MQTT Server: {request.form.get('mqtt_server')}")
    print(f"MQTT Port: {request.form.get('mqtt_port')}")
    print(f"Username: {request.form.get('username')}")
    print(f"Password: {request.form.get('password')}")
    
    # Return a 200 OK response
    return '', 200

@app.route('/wifi', methods=['POST'])
def wifi_refresh():
    # Handle the refresh action
    refresh = request.args.get('refresh')
    if refresh == '1':
        print("Refresh button clicked")
    return '', 200

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=5000, debug=True)