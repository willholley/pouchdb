'use strict';

var adapters = ['http', 'local'];

adapters.forEach(function (adapter) {
  describe('test.revs_diff.js-' + adapter, function () {

    var dbs = {};
    var  dbcounter = 0;

    beforeEach(function (done) {
      dbs.name = testUtils.adapterUrl(adapter, 'test_revs_diff_' + dbcounter++);
      testUtils.cleanup([dbs.name], done);
    });

    after(function (done) {
      testUtils.cleanup([dbs.name], done);
    });


    it('Test revs diff', function (done) {
      var db = new PouchDB(dbs.name);
      var revs = [];
      db.post({
        test: 'somestuff',
        _id: 'somestuff'
      }, function (err, info) {
        revs.push(info.rev);
        db.put({
          _id: info.id,
          _rev: info.rev,
          another: 'test'
        }, function (err, info2) {
          revs.push(info2.rev);
          db.revsDiff({ 'somestuff': revs }, function (err, results) {
            results.should.not.include.keys('somestuff');
            revs.push('2-randomid');
            db.revsDiff({ 'somestuff': revs }, function (err, results) {
              results.should.include.keys('somestuff');
              results.somestuff.missing.should.have.length(1);
              done();
            });
          });
        });
      });
    });

    it('Missing docs should be returned with all revisions', function (done) {
      new PouchDB(dbs.name, function (err, db) {
        var revs = ['1-a', '2-a', '2-b'];
        db.revsDiff({'foo': revs }, function (err, results) {
          results.should.include.keys('foo');
          results.foo.missing.should.deep.equal(revs, 'listed all revs');
          done();
        });
      });
    });

    it('Conflicting revisions that are available', function (done) {
      var doc = {_id: '939', _rev: '1-a'};
      function createConflicts(db, callback) {
        db.put(doc, { new_edits: false }, function (err, res) {
          testUtils.putAfter(db, {
            _id: '939',
            _rev: '2-a'
          }, '1-a', function (err, res) {
            testUtils.putAfter(db, {
              _id: '939',
              _rev: '2-b'
            }, '1-a', callback);
          });
        });
      }
      var db = new PouchDB(dbs.name);
      createConflicts(db, function () {
        db.revsDiff({'939': ['1-a', '2-a', '2-b']}, function (err, results) {
          results.should.not.include.keys('939');
          done();
        });
      });
    });

    it('Deleted revisions that are available', function (done) {
      function createDeletedRevision(db, callback) {
        db.put({
          _id: '935',
          _rev: '1-a'
        }, { new_edits: false }, function (err, info) {
          testUtils.putAfter(db, {
            _id: '935',
            _rev: '2-a',
            _deleted: true
          }, '1-a', callback);
        });
      }
      var db = new PouchDB(dbs.name);
      createDeletedRevision(db, function () {
        db.revsDiff({'935': ['1-a', '2-a']}, function (err, results) {
          results.should.not.include.keys('939');
          done();
        });
      });
    });

  });
});
