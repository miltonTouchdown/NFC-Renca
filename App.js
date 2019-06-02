/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {
  Platform, 
  StyleSheet, 
  Text, 
  View,
  Button,
  FlatList,
  Slider,
  Keyboard,
  TextInput,
  NativeModules
} from 'react-native';
import NfcManager, {Ndef} from 'react-native-nfc-manager';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-community/async-storage';
import { String } from 'core-js';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

const RtdType = {
  URL: 0,
  TEXT: 1,
};

// function buildUrlPayload(valueToWrite) {
//   return Ndef.encodeMessage([
//       Ndef.uriRecord(valueToWrite),
//   ]);
// }

function buildTextPayload(valueToWrite) {
  return Ndef.encodeMessage([
      Ndef.textRecord(valueToWrite),
  ]);
}

type Props = {};
export default class App extends Component<Props> 
{
  
  state = {
    voices: [],
    ttsStatus: "initiliazing",
    selectedVoice: null,
    speechRate: 0.5,
    speechPitch: 1,
    text: "Esto es un texto de ejemplo. Lo logré",
    NFC_supported: true,
    NFC_enabled: false,
    NFC_isWriting: false,
    NFC_urlToWrite: 'Proyecto NFC Renca',
    NFC_rtdType: RtdType.TEXT,
    NFC_parsedText: null,
    NFC_tag: {},
  };

  constructor(props) 
  {
    super(props);
   
    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: "started" })
    );
    Tts.addEventListener("tts-finish", event =>
      this.setState({ ttsStatus: "finished" })
    );
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: "cancelled: " + JSON.stringify(event)})
    );
    //Tts.setDefaultRate(this.state.speechRate);
    //Tts.setDefaultPitch(this.state.speechPitch);
    Tts.getInitStatus().then(this.initTts).then(this.getData).then(this._initConfig);
  }

  componentDidMount() {
    NfcManager.isSupported()
        .then(NFC_supported => {
            this.setState({ NFC_supported });
            if (NFC_supported) {
                this._startNfc();
            }
        })
  }

  componentWillUnmount() {
      if (this._stateChangedSubscription) {
          this._stateChangedSubscription.remove();
      }
  }

  //#region TTS
  initTts = async () => {
    const voices = await Tts.voices();
    const availableVoices = voices
      .filter(v => !v.networkConnectionRequired && !v.notInstalled)
      .map(v => {
        return { id: v.id, name: v.name, language: v.language };
      });

    const voicesLanguageDevice = this._getVoicesCurrentLanguageDevice(availableVoices);

    let selectedVoice = null;
    if (voicesLanguageDevice && voicesLanguageDevice.length > 0) {
      selectedVoice = voicesLanguageDevice[0].id;
      try {
        await Tts.setDefaultLanguage(voicesLanguageDevice[0].language);
      } catch (err) {
        // My Samsung S9 has always this error: "Language is not supported"
        console.log(`setDefaultLanguage error `, err);
      }
      await Tts.setDefaultVoice(voicesLanguageDevice[0].id);
      this.setState({
        voices: voicesLanguageDevice,
        selectedVoice,
        ttsStatus: "initialized"
      });
    } else {
      this.setState({ ttsStatus: "initialized" });
    }
    console.log("Finish initTts");
  };

  _getVoicesCurrentLanguageDevice(currVoices)
  {
    let languageDevice = this._getLanguageDevice();

     return (currVoices.filter(v => v.language.substring(0, 2).toLowerCase() == languageDevice.toLowerCase()).map(v => {
      return { id: v.id, name: v.name, language: v.language };
    }));
  }

  _getLanguageDevice()
  {
    let systemLanguage = 'es';
    if(Platform.OS == 'android')
    {
      systemLanguage = NativeModules.I18nManager.localeIdentifier;
    }
    if(Platform.OS == 'ios')
    {
      systemLanguage = NativeModules.SettingsManager.settings.AppleLocale;
    }

    const languageCode = systemLanguage.substring(0, 2);

    return languageCode;
  }

  readText = async () => {
    Tts.stop();
    Tts.speak(this.state.text);
  };

  stopText = async () => {
    Tts.stop();
  };

  setSpeechRate = async rate => {
    await Tts.setDefaultRate(rate);
    this.setState({ speechRate: rate });

    this.storeData();
  };

  setSpeechPitch = async rate => {
    await Tts.setDefaultPitch(rate);
    this.setState({ speechPitch: rate });
  };

  onVoicePress = async voice => {
    try {
      await Tts.setDefaultLanguage(voice.language);
    } catch (err) {
      // My Samsung S9 has always this error: "Language is not supported"
      console.log(`setDefaultLanguage error `, err);
    }
    await Tts.setDefaultVoice(voice.id);
    this.setState({ selectedVoice: voice.id });
  };

  renderVoiceItem = ({ item }) => {
    return (
      <Button
        style={styles.instructions}
        title={`${item.language} - ${item.name || item.id}`}
        color={this.state.selectedVoice === item.id ? undefined : "#969696"}
        onPress={() => this.onVoicePress(item)}
      />
    );
  };
  //#endregion

  //#region Storage_Data
  storeData = async () => {
    try {
      await AsyncStorage.setItem('@AUDIO_Speed', JSON.stringify(this.state.speechRate))
      await AsyncStorage.setItem('@AUDIO_Pitch', JSON.stringify(this.state.speechPitch))
      await AsyncStorage.setItem('@AUDIO_Voice', this.state.selectedVoice)
    } catch (e) {
      // saving error
    }
  }

  getData = async () => 
  {
    try {
      const speedValue = await AsyncStorage.getItem('@AUDIO_Speed')
      const pitchValue = await AsyncStorage.getItem('@AUDIO_Pitch')
      const voiceValue = await AsyncStorage.getItem('@AUDIO_Voice')

      console.log("Get Single Data: " + voiceValue);
      if(speedValue !== null) 
      {
        this.setState({ speechRate: parseFloat(speedValue)});       
      }
      if(pitchValue !== null) 
      {
        this.setState({ speechPitch: parseFloat(pitchValue)});
      }
      if(voiceValue !== null) 
      {
        // Verificar si existe la voz guardada debido a que el usuario puede cambiar de idioma.
        let isVoiceExist = this.state.voices.filter(v => v.id == voiceValue).map(v => {
          return { id: v.id, name: v.name, language: v.language };
        })

        if(isVoiceExist.length > 0) 
        {
          this.setState({ selectedVoice: voiceValue});
        }
      }
    } catch(e) {
      // error reading value
    }
  }

  // removeValue = async () => {
  //   try {
  //     await AsyncStorage.removeItem('@MyApp_key')
  //   } catch(e) {
  //     // remove error
  //   }
  
  //   console.log('Done.')
  // }

  //#endregion

  //#region NFC

  _requestFormat = () => {
    let {NFC_isWriting} = this.state;
    if (NFC_isWriting) {
        return;
    }

    this.setState({NFC_isWriting: true});
    NfcManager.requestNdefWrite(null, {format: true})
        .then(() => console.log('format completed'))
        .catch(err => console.warn(err))
        .then(() => this.setState({NFC_isWriting: false}));
  }

  _requestNdefWrite = () => {
      let {NFC_isWriting, NFC_urlToWrite, NFC_rtdType} = this.state;

      if (NFC_isWriting) 
      {
          return;
      }

      this._startDetection();

      let bytes;

      if(NFC_rtdType === RtdType.TEXT) 
      {
          bytes = buildTextPayload(this.state.text);
      }

      this.setState({NFC_isWriting: true});
      NfcManager.requestNdefWrite(bytes)
          .then(() => console.log('write completed'))
          .catch(err => console.warn(err))
          .then(() => this.setState({NFC_isWriting: false}).then(this._stopDetection));
  }

  _cancelNdefWrite = () => {
      this.setState({NFC_isWriting: false});
      NfcManager.cancelNdefWrite()
          .then(() => console.log('write cancelled'))
          .catch(err => console.warn(err))
  }

  _requestAndroidBeam = () => {
      let {NFC_isWriting, NFC_urlToWrite, NFC_rtdType} = this.state;
      if (NFC_isWriting) {
          return;
      }

      let bytes;

      if (NFC_rtdType === RtdType.URL) {
          bytes = buildUrlPayload(NFC_urlToWrite);
      } else if (NFC_rtdType === RtdType.TEXT) {
          bytes = buildTextPayload(NFC_urlToWrite);
      }

      this.setState({NFC_isWriting: true});
      NfcManager.setNdefPushMessage(bytes)
          .then(() => console.log('beam request completed'))
          .catch(err => console.warn(err))
  }

  _cancelAndroidBeam = () => {
      this.setState({NFC_isWriting: false});
      NfcManager.setNdefPushMessage(null)
          .then(() => console.log('beam cancelled'))
          .catch(err => console.warn(err))
  }

  _startNfc() {
      NfcManager.start({
          onSessionClosedIOS: () => {
              console.log('ios session closed');
          }
      })
          .then(result => {
              console.log('start OK', result);
          })
          .catch(error => {
              console.warn('start fail', error);
              this.setState({NFC_supported: false});
          })

      if (Platform.OS === 'android') {
          NfcManager.getLaunchTagEvent()
              .then(NFC_tag => {
                  console.log('launch tag', NFC_tag);
                  if (NFC_tag) 
                  {
                      /*
                      * Se ha detectado un tag al iniciar la aplicacion
                      */
                      this.setState({ NFC_tag });
                      let text = this._parseText(NFC_tag);
                      this.setState({NFC_parsedText: text});

                      //Iniciar lectura en audio del texto 
                      this.setState({text: this._parseText(NFC_tag)});
                      //Iniciar lectura en audio del texto      
                      this._readNFCTagText();                    
                  }
              })
              .catch(err => {
                  console.log(err);
              })
          NfcManager.isEnabled()
              .then(NFC_enabled => {
                  this.setState({ NFC_enabled });
              })
              .catch(err => {
                  console.log(err);
              })
          NfcManager.onStateChanged(
              event => {
                  if (event.state === 'on') {
                      this.setState({NFC_enabled: true});
                  } else if (event.state === 'off') {
                      this.setState({enabled: false});
                  } else if (event.state === 'turning_on') {
                      // do whatever you want
                  } else if (event.state === 'turning_off') {
                      // do whatever you want
                  }
              }
          )
              .then(sub => {
                  this._stateChangedSubscription = sub; 
                  // remember to call this._stateChangedSubscription.remove()
                  // when you don't want to listen to this anymore
              })
              .catch(err => {
                  console.warn(err);
              })
      }
  }

  _onTagDiscovered = NFC_tag => {
      console.log('Tag Discovered', NFC_tag);
      //this.setState({NFC_tag });
      // let url = this._parseUri(NFC_tag);
      // if (url) {
      //     Linking.openURL(url)
      //         .catch(err => {
      //             console.warn(err);
      //         })
      // }

      //let text = this._parseText(NFC_tag);
      //this.setState({NFC_parsedText: text});

      /*
      * Se ha detectado un tag al iniciar la aplicacion
      */
      this.setState({ NFC_tag });
      let text = this._parseText(NFC_tag);
      this.setState({NFC_parsedText: text});

      this.setState({text: this._parseText(NFC_tag)});

      if (Platform.OS === 'ios')
      {
        // Cerrar ventana de lectura nfc
        // luego se espera un segundo para esperar el cierre
        // de la interfaz de nfc para posteriormente 
        //iniciar lectura en audio del texto 
        NfcManager.unregisterTagEvent()
          .then(result => {
              console.log('unregisterTagEvent OK', result);   
          })
          .catch(error => {
              console.warn('unregisterTagEvent fail', error)
          }).then(setTimeout(this._readNFCTagText, 1000));

      }else
      {
        // Android
        //Iniciar lectura en audio del texto      
        this._readNFCTagText();
      }  
  }

  _startDetection = () => {
    
      NfcManager.registerTagEvent(
        this._onTagDiscovered,
        'Mantén tu dispositivo sobre el tag NFC',
        {
          //invalidateAfterFirstRead: true
        }      
        )
          .then(result => {
              console.log('registerTagEvent OK', result)
          })
          .catch(error => {
              console.warn('registerTagEvent fail', error)
          })
  }

  _stopDetection = () => {
      NfcManager.unregisterTagEvent()
          .then(result => {
              console.log('unregisterTagEvent OK', result)             
          })
          .catch(error => {
              console.warn('unregisterTagEvent fail', error)
          })
  }

  _clearMessages = () => {
      this.setState({NFC_tag: null});
  }

  _goToNfcSetting = () => {
      if (Platform.OS === 'android') {
          NfcManager.goToNfcSetting()
              .then(result => {
                  console.log('goToNfcSetting OK', result)
              })
              .catch(error => {
                  console.warn('goToNfcSetting fail', error)
              })
      }
  }

  _parseUri = (NFC_tag) => {
      try {
          if (Ndef.isType(NFC_tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
              return Ndef.uri.decodePayload(NFC_tag.ndefMessage[0].payload);
          }
      } catch (e) {
          console.log(e);
      }
      return null;
  }

  _parseText = (NFC_tag) => {
      try {
          if (Ndef.isType(NFC_tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
              return Ndef.text.decodePayload(NFC_tag.ndefMessage[0].payload);
          }
      } catch (e) {
          console.log(e);
      }
      return null;
  }

  //#endregion

  //#region Application_Renca
  _initConfig = async () =>
  {
    console.log("Init Config");
    Tts.setDefaultVoice(this.state.selectedVoice);
    Tts.setDefaultPitch(this.state.speechPitch);
    Tts.setDefaultRate(this.state.speechRate);

    //Iniciar lectura de tag nfc
    if(Platform.OS == 'ios')
    {
      this._startDetection();
    }
  }

  _readNFCTagText = async() => {
    Tts.stop();
    Tts.speak(this.state.text); 
  };

  //#endregion

  //#region Render
  render() 
  {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{`NFC Renca`}</Text>

        <Button title={`start nfc`} onPress={this._startDetection} />
        <Button title={`Read text`} onPress={this.readText} />
        <Button title={`Stop text`} onPress={this.stopText} />

        <Text style={styles.label}>{`Status: ${this.state.ttsStatus ||
          ""}`}</Text>

        <Text style={styles.label}>{`Selected Voice: ${this.state
          .selectedVoice || ""}`}</Text>

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Speed: ${this.state.speechRate.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.01}
            maximumValue={0.99}
            value={this.state.speechRate}
            onSlidingComplete={this.setSpeechRate}
          />
        </View>       

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Pitch: ${this.state.speechPitch.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2}
            value={this.state.speechPitch}
            onSlidingComplete={this.setSpeechPitch}
          />
        </View>

        <Button title={`Write text`} onPress={this._requestNdefWrite} />
        
          <TextInput
            style={styles.textInput}
            multiline={true}
            onChangeText={text => this.setState({ text })}
            value={this.state.text}
            onSubmitEditing={Keyboard.dismiss}
          />
          
        <View style={styles.textInput}>
        <FlatList
          keyExtractor={item => item.id}
          renderItem={this.renderVoiceItem}
          extraData={this.state.selectedVoice}
          data={this.state.voices}
        />
        </View>
      </View>
    );
  }
  //#endregion
} 

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF"
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
  label: {
    textAlign: "center"
  },
  sliderContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  sliderLabel: {
    textAlign: "center",
    marginRight: 20
  },
  slider: {
    width: 150
  },
  textInput: {
    borderColor: "gray",
    borderWidth: 1,
    flex: 1,
    width: "100%"
  }
});
