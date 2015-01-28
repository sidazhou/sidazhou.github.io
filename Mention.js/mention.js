/*jslint forin: true */

// Modified by Sida Zhou
// http://sidazhou.com
// - _matcher uses slightly different logic in order to:
//     - Added Ability to insert inbetween text
//     - Fixed issue with having usernames with periods or dashes   
//     - Fixed duplicate bug when the username and name are the same
// - _update now returns cursor position, which is consumed in bootstrap-typeahead.js
// - _update updated to be compatible with insertion inbetween text
// - Minor formatting change in _render

// http://stackoverflow.com/questions/499126/jquery-set-cursor-position-in-text-area
$.fn.selectRange = function(start, end) {
    if(!end) end = start; 
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

;(function($) {
    $.fn.extend({
        mention: function(options) {
            this.opts = {
                users: [],
                delimiter: '@',
                sensitive: true,
                emptyQuery: false,
                queryBy: ['name', 'username'],
                typeaheadOpts: {}
            };

            var settings = $.extend({}, this.opts, options),
                _checkDependencies = function() {
                    if (typeof $ == 'undefined') {
                        throw new Error("jQuery is Required");
                    }
                    else {
                        if (typeof $.fn.typeahead == 'undefined') {
                            throw new Error("Typeahead is Required");
                        }
                    }
                    return true;
                },
                _extractCurrentQuery = function(query, caratPos) {
                    var i;
                    for (i = caratPos; i >= 0; i--) {
                        if (query[i] == settings.delimiter) {
                            break;
                        }
                    }
                    return query.substring(i, caratPos);
                },
                _matcher = function(itemProps) {
                    var i;
                    var caratPos = this.$element[0].selectionStart;

                    if(settings.emptyQuery){
                      var q = (this.query.toLowerCase()),    
                        lastChar = q.slice(caratPos-1,caratPos);
                      if(lastChar==settings.delimiter){
                        return true;
                      }
                    }

                    for (i in settings.queryBy) {
                        if (itemProps[settings.queryBy[i]]) {
                            var item = itemProps[settings.queryBy[i]].toLowerCase();
                            var q = this.query.toLowerCase().substr(0,caratPos);
                            var j;
                            var usernames = q.substr(q.lastIndexOf(settings.delimiter)); 

                            if (q.lastIndexOf(settings.delimiter) == -1) {// no '@' found
                                usernames = [];
                            } else {
                                usernames = [usernames]; // consistancy with the old format
                            }

                            if ( !! usernames) {
                                for (j = 0; j < usernames.length; j++) {
                                    var username = (usernames[j].substring(1)).toLowerCase(),
                                        re = new RegExp(settings.delimiter + item, "g"),
                                        used = ((this.query.toLowerCase()).match(re));

                                    //if db-list matches with a user in the query && 
                                    if (item.indexOf(username) != -1) { 
                                        return true;                //true = db-list has a match
                                    }
                                }
                            }
                        }
                    }
                },
                _updater = function(item) {
                    var data = this.query,
                        caratPos = this.$element[0].selectionStart,
                        i;
                    
                    for (i = caratPos-1; i >= 0; i--) {
                        if (data[i] == settings.delimiter) {
                            break;
                        }
                    }

                    var replace = data.substring(i, caratPos),
                      textBefore = data.substring(0, i),
                      textAfter = data.substring(caratPos);

                    var data = textBefore + settings.delimiter + item + textAfter;

                    this.tempQuery = data;

                    newCaratPos = (textBefore + settings.delimiter + item).length

                    return [data, newCaratPos];
                },
                _sorter = function(items) {
                    if (items.length && settings.sensitive) {
                        var currentUser = _extractCurrentQuery(this.query, this.$element[0].selectionStart).substring(1),
                            i, len = items.length,
                            priorities = {
                                highest: [],
                                high: [],
                                med: [],
                                low: []
                            }, finals = [];
                        if (currentUser.length == 1) {
                            for (i = 0; i < len; i++) {
                                var currentRes = items[i];

                                if ((currentRes.username[0] == currentUser)) {
                                    priorities.highest.push(currentRes);
                                }
                                else if ((currentRes.username[0].toLowerCase() == currentUser.toLowerCase())) {
                                    priorities.high.push(currentRes);
                                }
                                else if (currentRes.username.indexOf(currentUser) != -1) {
                                    priorities.med.push(currentRes);
                                }
                                else {
                                    priorities.low.push(currentRes);
                                }
                            }
                            for (i in priorities) {
                                var j;
                                for (j in priorities[i]) {
                                    finals.push(priorities[i][j]);
                                }
                            }
                            return finals;
                        }
                    }
                    return items;
                },
                _render = function(items) {
                    var that = this;
                    items = $(items).map(function(i, item) {

                        i = $(that.options.item).attr('data-value', item.username);

                        var _linkHtml = $('<div> </div>');

                        if (item.image) {
                            _linkHtml.append('<img class="mention_image" src="' + item.image + '">');
                        }
                        if (item.username) {
                            _linkHtml.append('<b class="mention_username"> ' + settings.delimiter + item.username + '</b>');
                        }
                        if (item.name) {
                            _linkHtml.append('<span class="mention_name">' + item.name + '</span>');
                        }
                        i.find('a').html(that.highlighter(_linkHtml.html()));
                        return i[0];
                    });

                    items.first().addClass('active');
                    this.$menu.html(items);

                    return this;
                };

            $.fn.typeahead.Constructor.prototype.render = _render;

            return this.each(function() {
                var _this = $(this);
                if (_checkDependencies()) {
                    _this.typeahead($.extend({
                        source: settings.users,
                        matcher: _matcher,
                        updater: _updater,
                        sorter: _sorter
                    }, settings.typeaheadOpts));
                }
            });
        }
    });
})(jQuery);