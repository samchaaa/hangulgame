let score = 0;
let level = 1;
let words = [];
let currentWord = '';
let currentInput = '';
let simpleWords = ['안녕', '학교', '책', '친구', '사랑', '가족'];
let advancedWords = ['안녕하세요', '감사합니다', '사랑해요', '행복', '여행', '영화', '음악'];

const keyboard = [
    ['ㅂ/q', 'ㅈ/w', 'ㄷ/e', 'ㄱ/r', 'ㅅ/t', 'ㅛ/y', 'ㅕ/u', 'ㅑ/i', 'ㅐ/o', 'ㅔ/p'],
    ['ㅁ/a', 'ㄴ/s', 'ㅇ/d', 'ㄹ/f', 'ㅎ/g', 'ㅗ/h', 'ㅓ/j', 'ㅏ/k', 'ㅣ/l'],
    ['ㅋ/z', 'ㅌ/x', 'ㅊ/c', 'ㅍ/v', 'ㅠ/b', 'ㅜ/n', 'ㅡ/m']
];

function serverLog(message) {
    console.log(message);
    $.ajax({
        url: '/log',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: message }),
        success: function(response) {
            // Log sent successfully
        },
        error: function(error) {
            console.error('Error sending log to server:', error);
        }
    });
}

function createKeyboard() {
    const keyboardDiv = $('#keyboard');
    keyboard.forEach((row, rowIndex) => {
        const rowDiv = $('<div>').addClass('keyboard-row');
        if (rowIndex === 1) rowDiv.css('padding-left', '20px');
        if (rowIndex === 2) rowDiv.css('padding-left', '50px'); // Increased padding for bottom row
        row.forEach(key => {
            const [korean, english] = key.split('/');
            const keyDiv = $('<div>')
                .addClass('key')
                .attr('data-key', korean)
                .attr('data-korean', korean);
            
            // Add Korean letter
            $('<span>')
                .addClass('korean-letter')
                .text(korean)
                .appendTo(keyDiv);
            
            // Add English letter
            $('<span>')
                .addClass('english-letter')
                .text(english || '')
                .appendTo(keyDiv);
            
            rowDiv.append(keyDiv);
            serverLog('Created key: ' + korean + ' ' + keyDiv[0].outerHTML);
        });
        keyboardDiv.append(rowDiv);
    });
}

// Add this variable at the top of your file, with other global variables
let currentJamoIndex = 0;

// Modify the highlightNextLetter function
function highlightNextLetter() {
    $('#keyboard .key').removeClass('highlight next-letter correct incorrect');
    if (words.length > 0) {
        const nextWord = words[0].text();
        if (currentInput.length < nextWord.length) {
            const nextChar = nextWord[currentInput.length];
            const decomposedChars = decomposeHangul(nextChar);
            console.log('Next letter (decomposed):', decomposedChars);

            if (currentJamoIndex < decomposedChars.length) {
                const nextJamo = decomposedChars[currentJamoIndex];
                console.log('Next jamo to highlight:', nextJamo);

                // Get the compatibility jamo if it exists
                const compatibilityJamo = jamoToCompatibilityJamo[nextJamo] || nextJamo;

                // Highlight the basic jamo key
                const basicJamoKey = $('#keyboard .key[data-key="' + compatibilityJamo + '"]');
                if (basicJamoKey.length > 0) {
                    basicJamoKey.addClass('next-letter');
                    serverLog('Highlighted basic jamo: ' + basicJamoKey[0].outerHTML);
                } else {
                    serverLog('Key not found for basic jamo: ' + compatibilityJamo);
                }

                // If it's the first jamo of a syllable, also highlight potential full characters
                if (currentJamoIndex === 0) {
                    const fullChars = fullCharacterMap[compatibilityJamo] || [];
                    fullChars.forEach(fullChar => {
                        const keyElement = $('#keyboard .key[data-key="' + fullChar + '"]');
                        if (keyElement.length > 0) {
                            keyElement.addClass('next-letter');
                            serverLog('Highlighted full char: ' + keyElement[0].outerHTML);
                        }
                    });
                }
            } else {
                currentJamoIndex = 0; // Reset for the next character
            }
        }
    }
}

function highlightTypedKeys(input, word) {
    $('#keyboard .key').removeClass('correct incorrect');
    for (let i = 0; i < input.length; i++) {
        const typedLetter = input[i];
        const correctLetter = word[i];
        
        serverLog('Typed letter: ' + typedLetter + ', Correct letter: ' + correctLetter);
        const keyElement = $('#keyboard .key[data-korean="' + typedLetter + '"]');
        if (keyElement.length > 0) {
            if (typedLetter === correctLetter) {
                keyElement.addClass('correct');
                serverLog('Highlighted correct: ' + keyElement[0].outerHTML);
            } else {
                keyElement.addClass('incorrect');
                serverLog('Highlighted incorrect: ' + keyElement[0].outerHTML);
            }
        } else {
            serverLog('Key not found for typed letter: ' + typedLetter);
        }
    }
}

function isWordTooLow(word) {
    const containerHeight = $('#game-container').height();
    const wordPosition = word.position().top;
    const threshold = containerHeight * 0.7; // 30% from the bottom
    return wordPosition > threshold;
}

// Modify the updateCurrentWord function
function updateCurrentWord() {
    $('.word').removeClass('current');
    if (words.length > 0) {
        if (isWordTooLow(words[0])) {
            words[0].remove();
            words.shift();
            updateCurrentWord(); // Recursively call to check the next word
        } else {
            words[0].addClass('current');
            currentWord = words[0].text();
            currentJamoIndex = 0; // Reset jamo index for the new current word
            highlightNextLetter();
        }
    } else {
        createWord();
    }
    logGameState();
}

function createWord() {
    serverLog('Attempting to create a new word');
    $.get('/get_word', function(data) {
        if (data && data.word) {
            // Hide instructions when the first word is created
            $('#instructions').css('opacity', '0');

            const newWord = data.word;
            serverLog('New word received from server: ' + newWord);
            const word = $('<div>').addClass('word').text(newWord);
            
            // Randomize horizontal position
            const containerWidth = $('#game-container').width();
            const wordWidth = newWord.length * 20; // Estimate word width
            const maxLeft = containerWidth - wordWidth;
            const randomLeft = Math.random() * maxLeft;
            
            word.css({
                left: randomLeft + 'px',
                top: '-30px', // Start above the container
                transform: 'none' // Remove the centering transform
            });
            
            $('#game-container').append(word);
            words.push(word);
            serverLog('New word added. Current word count: ' + words.length);
            updateCurrentWord();

            const duration = 30000 + Math.random() * 10000; // 30-40 seconds
            word.animate({ top: '570px' }, {
                duration: duration,
                easing: 'linear',
                step: function(now, fx) {
                    if (now >= 570) {
                        word.remove();
                        words = words.filter(w => w !== word);
                        updateCurrentWord();
                    }
                }
            });
        } else {
            serverLog('Error: No word received from server');
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        serverLog('Error fetching word from server: ' + textStatus + ', ' + errorThrown);
    });
}

function startGame() {
    createKeyboard();
    checkKeys();
    showInstructions(); // Show instructions when the game starts
    setTimeout(() => {
        createWord(); // Create the first word after a delay
        setInterval(createWord, 10000); // New word every 10 seconds
    }, 5000); // 5-second delay before the first word appears
}

function showLevelUpMessage(level) {
    const message = `Level up! Level ${level} achieved. New words added!`;
    const messageElement = $('<div id="level-up-message"></div>').text(message);
    $('#game-container').append(messageElement);
    messageElement.fadeIn(500).delay(2000).fadeOut(500, function() {
        $(this).remove();
    });
}

function levelUp() {
    level++;
    $('#level-value').text(level);
    serverLog('Attempting to level up to level ' + level);
    
    $.ajax({
        url: '/update_words',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ level: level }),
        success: function(response) {
            serverLog('Server response for level up: ' + JSON.stringify(response));
            
            // Show level up message
            showLevelUpMessage(level);
            
            // Clear existing words and create new ones
            serverLog('Clearing existing words. Current word count: ' + words.length);
            words.forEach(word => word.remove());
            words = [];
            serverLog('Words cleared. New word count: ' + words.length);
            
            // Create multiple new words to ensure the game continues
            serverLog('Creating new words for level ' + level);
            for (let i = 0; i < 3; i++) {
                createWord();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            serverLog('Error during level up: ' + textStatus + ', ' + errorThrown);
        }
    });
}

function logGameState() {
    serverLog('Current game state:');
    serverLog('Current word: ' + (words.length > 0 ? words[0].text() : 'No words'));
    serverLog('Current input: ' + currentInput);
}

let composingHangul = false;

$(document).on('compositionstart', function() {
    composingHangul = true;
});

$(document).on('compositionend', function(e) {
    composingHangul = false;
    handleInput(e.originalEvent.data);
});

$(document).on('input', function(e) {
    if (!composingHangul) {
        handleInput(e.originalEvent.data);
    }
});

$(document).on('keydown', function(e) {
    if (e.key === 'Backspace') {
        if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            $('#input').val(currentInput);
            if (words.length > 0) {
                highlightTypedKeys(currentInput, words[0].text());
            }
            highlightNextLetter();
            logGameState();
        }
        e.preventDefault();
    }
});

// Add this function to remove the incorrect-partial highlight
function removeIncorrectPartialHighlight(key) {
    setTimeout(() => {
        key.removeClass('incorrect-partial');
    }, 300); // Remove the highlight after 300ms
}

// Modify the handleInput function
function handleInput(input) {
    if (input) {
        // Append the new input to the current input
        currentInput += input;
        $('#input').val(currentInput);

        if (words.length > 0) {
            const nextWord = words[0].text();
            
            // Check if the current input matches the start of the next word
            if (nextWord.startsWith(currentInput)) {
                highlightTypedKeys(currentInput, currentWord);
                
                if (currentWord === currentInput) {
                    // Word completed successfully
                    const completedWord = words[0];
                    
                    // Create and append starburst element
                    const starburst = $('<div>').addClass('starburst');
                    completedWord.append(starburst);
                    
                    // Center the starburst on the word
                    const wordWidth = completedWord.width();
                    const wordHeight = completedWord.height();
                    starburst.css({
                        left: -wordWidth / 2,
                        top: -wordHeight / 2
                    });
                    
                    // Remove the word and starburst after animation
                    setTimeout(() => {
                        completedWord.remove();
                        words.shift();
                    }, 800); // Match this to the starburst animation duration

                    score += 1;
                    $('#score-value').text(score);
                    currentInput = '';
                    currentJamoIndex = 0; // Reset jamo index for the next word
                    $('#input').val(currentInput);

                    // Check for level up after each successful word
                    if (score >= 5) {
                        levelUp();
                    } else {
                        serverLog('Word typed successfully: ' + currentWord);
                        updateCurrentWord();
                        showSuccessAnimations();
                    }
                } else {
                    // Partial match, update highlighting
                    highlightNextLetter();
                }
            } else {
                // Input doesn't match, but we keep the input
                // Just update the highlighting
                highlightTypedKeys(currentInput, currentWord);
                highlightNextLetter();
            }
        }
        logGameState();
    }
}

function showSuccessAnimations() {
    // Flash effect
    $('#game-container').addClass('success-flash');
    setTimeout(() => {
        $('#game-container').removeClass('success-flash');
    }, 500);

    // Floating score animation
    const floatingScore = $('<div>')
        .addClass('floating-score')
        .text('+1')
        .css({
            left: Math.random() * ($('#game-container').width() - 50) + 'px',
            top: $('#game-container').height() / 2 + 'px'
        });

    $('#game-container').append(floatingScore);

    setTimeout(() => {
        floatingScore.remove();
    }, 1000);
}

// Add this function at the end of the file
function showInstructions() {
    $('#instructions').css('opacity', '1');
}

startGame();

function checkKeys() {
    serverLog('Total keys: ' + $('.key').length);
    $('.key').each(function() {
        serverLog('Key: ' + $(this).attr('data-key'));
    });
}

// Add this new mapping at the top of your file
const jamoToCompatibilityJamo = {
    'ᄀ': 'ㄱ', 'ᄁ': 'ㄲ', 'ᄂ': 'ㄴ', 'ᄃ': 'ㄷ', 'ᄄ': 'ㄸ', 'ᄅ': 'ㄹ',
    'ᄆ': 'ㅁ', 'ᄇ': 'ㅂ', 'ᄈ': 'ㅃ', 'ᄉ': 'ㅅ', 'ᄊ': 'ㅆ', 'ᄋ': 'ㅇ',
    'ᄌ': 'ㅈ', 'ᄍ': 'ㅉ', 'ᄎ': 'ㅊ', 'ᄏ': 'ㅋ', 'ᄐ': 'ㅌ', 'ᄑ': 'ㅍ', 'ᄒ': 'ㅎ',
    'ᅡ': 'ㅏ', 'ᅢ': 'ㅐ', 'ᅣ': 'ㅑ', 'ᅤ': 'ㅒ', 'ᅥ': 'ㅓ', 'ᅦ': 'ㅔ',
    'ᅧ': 'ㅕ', 'ᅨ': 'ㅖ', 'ᅩ': 'ㅗ', 'ᅪ': 'ㅘ', 'ᅫ': 'ㅙ', 'ᅬ': 'ㅚ',
    'ᅭ': 'ㅛ', 'ᅮ': 'ㅜ', 'ᅯ': 'ㅝ', 'ᅰ': 'ㅞ', 'ᅱ': 'ㅟ', 'ᅲ': 'ㅠ',
    'ᅳ': 'ㅡ', 'ᅴ': 'ㅢ', 'ᅵ': 'ㅣ'
};

// Modify the decomposeHangul function
function decomposeHangul(char) {
    // Check if the character is already a Hangul Jamo
    if (jamoToCompatibilityJamo[char]) {
        return [jamoToCompatibilityJamo[char]];
    }

    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return [char]; // Not a Hangul syllable
    
    const jong = code % 28;
    const jung = (code - jong) / 28 % 21;
    const cho = ((code - jong) / 28 - jung) / 21;
    
    const jamos = [
        String.fromCharCode(0x1100 + cho),
        String.fromCharCode(0x1161 + jung)
    ];
    if (jong > 0) jamos.push(String.fromCharCode(0x11A7 + jong));
    
    return jamos.map(jamo => {
        const compatibilityJamo = jamoToCompatibilityJamo[jamo] || jamo;
        const decomposed = decompositionMap[compatibilityJamo] || compatibilityJamo;
        return decomposed.length > 1 ? decomposed[0] : decomposed;
    });
}

// Add this decomposition map
const decompositionMap = {
    'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
    'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', '': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ'
};

// Add this new mapping after the decompositionMap
const fullCharacterMap = {
    'ㄱ': ['가', '까'],
    'ㄲ': ['까'],
    'ㄴ': ['나'],
    'ㄷ': ['다', '따'],
    'ㄸ': ['따'],
    'ㄹ': ['라'],
    'ㅁ': ['마'],
    'ㅂ': ['바', '빠'],
    'ㅃ': ['빠'],
    'ㅅ': ['사', '싸'],
    'ㅆ': ['싸'],
    'ㅇ': ['아'],
    'ㅈ': ['자', '짜'],
    'ㅉ': ['짜'],
    'ㅊ': ['차'],
    'ㅋ': ['카'],
    'ㅌ': ['타'],
    'ㅍ': ['파'],
    'ㅎ': ['하'],
    'ㅏ': ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'],
    'ㅐ': ['개', '내', '대', '래', '매', '배', '새', '애', '재', '채', '캐', '태', '패', '해'],
    'ㅑ': ['갸', '냐', '댜', '랴', '먀', '뱌', '샤', '야', '쟈', '챠', '캬', '탸', '퍄', '햐'],
    'ㅒ': ['걔', '냬', '댸', '럐', '먜', '뱨', '섀', '얘', '쟤', '챼', '컈', '턔', '퍠', '햬'],
    'ㅓ': ['거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허'],
    'ㅔ': ['게', '네', '데', '레', '메', '베', '세', '에', '제', '체', '케', '테', '페', '헤'],
    'ㅕ': ['겨', '녀', '뎌', '려', '며', '벼', '셔', '여', '져', '쳐', '켜', '텨', '펴', '혀'],
    'ㅖ': ['계', '녜', '뎨', '례', '몌', '볘', '셰', '예', '졔', '쳬', '켸', '톄', '퍐', '혜'],
    'ㅗ': ['고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호'],
    'ㅘ': ['과', '놔', '돠', '롸', '뫄', '봐', '솨', '와', '좌', '촤', '콰', '톼', '퐈', '화'],
    'ㅙ': ['괘', '놰', '돼', '뢔', '뫠', '봬', '쇄', '왜', '좨', '쵀', '쾌', '퇘', '퐤', '홰'],
    'ㅚ': ['괴', '뇌', '되', '뢰', '뫼', '뵈', '쇠', '외', '죄', '최', '쾨', '퇴', '푀', '회'],
    'ㅛ': ['교', '뇨', '됴', '료', '묘', '뵤', '쇼', '요', '죠', '쵸', '쿄', '툐', '표', '효'],
    'ㅜ': ['구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후'],
    'ㅝ': ['궈', '눠', '둬', '뤄', '뭐', '붜', '숴', '워', '줘', '춰', '쿼', '퉈', '풔', '훠'],
    'ㅞ': ['궤', '눼', '뒈', '뤠', '뭬', '붸', '쉐', '웨', '줴', '췌', '퀘', '퉤', '풰', '훼'],
    'ㅟ': ['귀', '뉘', '뒤', '뤼', '뮈', '뷔', '쉬', '위', '쥐', '취', '퀴', '튜', '퓌', ''],
    'ㅠ': ['규', '뉴', '듀', '류', '뮤', '뷰', '슈', '유', '쥬', '츄', '큐', '튜', '퓨', '휴'],
    'ㅡ': ['그', '느', '드', '르', '므', '브', '스', '으', '즈', '츠', '크', '트', '프', '흐'],
    'ㅢ': ['긔', '늬', '듸', '릐', '믜', '븨', '싀', '의', '즤', '츼', '킈', '틔', '픠', '희'],
    'ㅣ': ['기', '니', '디', '리', '미', '비', '시', '이', '지', '치', '키', '티', '피', '히']
};