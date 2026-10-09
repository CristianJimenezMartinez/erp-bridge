/**
 * Scripts de interactividad y diagnóstico para Bentian ERP Bridge
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // 1. Diagnóstico REST API en tiempo real (Ping)
        var startTime = new Date().getTime();
        $.ajax({
            url: bentianBridgeData.restPing,
            type: 'GET',
            timeout: 8000,
            success: function(response) {
                var latency = new Date().getTime() - startTime;
                if (response && response.status === 'ok') {
                    $('#bentian-rest-ping-icon').text('✅');
                    $('#bentian-rest-ping-status').html('<span style="color:#10b981; font-weight:600;">Respondiendo en ' + latency + ' ms</span> (v' + response.version + ')');
                } else {
                    $('#bentian-rest-ping-icon').text('⚠️');
                    $('#bentian-rest-ping-status').text('Respuesta anómala de la API REST');
                }
            },
            error: function(xhr, status, error) {
                $('#bentian-rest-ping-icon').text('❌');
                $('#bentian-rest-ping-status').html('<span style="color:#ef4444;">Error de conexión REST: ' + (error || status) + '</span>');
            }
        });

        // 2. Generación automática de credenciales con 1-Click
        $('#bentian-btn-gen-keys').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var $spinner = $('#bentian-gen-spinner');

            $btn.prop('disabled', true);
            $spinner.addClass('is-active');

            $.ajax({
                url: bentianBridgeData.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'bentian_generate_keys',
                    nonce: bentianBridgeData.nonce
                },
                success: function(res) {
                    $btn.prop('disabled', false);
                    $spinner.removeClass('is-active');

                    if (res && res.success) {
                        $('#bentian-input-ck').val(res.data.consumer_key);
                        $('#bentian-input-cs').val(res.data.consumer_secret);
                        $('#bentian-credentials-display').slideDown(300);
                        $btn.text('🔄 Regenerar nuevas claves');
                    } else {
                        alert('Error: ' + (res.data ? res.data.message : 'No se pudieron generar las claves.'));
                    }
                },
                error: function(xhr, status, error) {
                    $btn.prop('disabled', false);
                    $spinner.removeClass('is-active');
                    alert('Error en la llamada AJAX: ' + error);
                }
            });
        });

        // 3. Botones de copiado al portapapeles
        $('.bentian-copy-btn').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var targetId = $btn.data('target');
            var input = document.getElementById(targetId);

            if (!input || !input.value) return;

            navigator.clipboard.writeText(input.value).then(function() {
                var originalText = $btn.text();
                $btn.text('¡Copiado! ✓').addClass('button-primary');
                setTimeout(function() {
                    $btn.text(originalText).removeClass('button-primary');
                }, 2000);
            }).catch(function(err) {
                input.select();
                document.execCommand('copy');
                $btn.text('¡Copiado! ✓');
            });
        });

        // 4. Alternar visibilidad de la clave secreta
        $('#bentian-toggle-secret').on('click', function(e) {
            e.preventDefault();
            var $input = $('#bentian-input-cs');
            var $btn = $(this);
            if ($input.attr('type') === 'password') {
                $input.attr('type', 'text');
                $btn.text('Ocultar');
            } else {
                $input.attr('type', 'password');
                $btn.text('Ver');
            }
        });
    });

})(jQuery);
