#!/bin/bash
JPM_OUT=$(jpm -b $FIREFOX_BIN test --verbose 2>&1 | tee >(cat - >&2)  ; (exit ${PIPESTATUS[0]}))
RESULT=$?
TOTAL=$(echo $JPM_OUT | sed -n 's/.* \([0-9]\+\) tests passed.*/\1/p')
PASSED=$(echo $JPM_OUT | sed -n 's/.* \([0-9]\+\) of [0-9]\+ tests passed.*/\1/p')
LOCALE_BUG=$(echo "$JPM_OUT" | grep "Plural form unknown for locale \"null\"")
TESTS_FAILED=$(echo $JPM_OUT | sed -n 's/.*The following tests failed:\(.*\)/\1/p' | tr -d '[[:space:]]')

if [ -z "$TESTS_FAILED" ] && [ ! -z "$LOCALE_BUG" ] && [ 0 -eq $(($TOTAL-1-$PASSED)) ]; then
    echo "Detected bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1103385"
    echo "Running workaround to return code 0 (passed)"
    let RESULT=0
fi

exit $RESULT
